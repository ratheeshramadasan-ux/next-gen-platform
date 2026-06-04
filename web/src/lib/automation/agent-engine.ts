/**
 * Automation Studio — Agent Engine (TypeScript)
 * Ported for Next Gen
 */

import { chromium, firefox, webkit, Browser as PWBrowser, BrowserContext, Page } from 'playwright';
import { Builder, By, Key, until, Browser as SelBrowser, WebDriver } from 'selenium-webdriver';
import path from 'path';
import fs from 'fs';
import { prisma } from '@/lib/prisma';
import { automationConfig } from './config';

export interface AgentStatus {
  status: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled' | 'error';
  executionId?: string;
  workflowId?: string;
  completedSteps?: number;
  totalSteps?: number;
  error?: string;
  browserType?: string;
}

export class AgentEngine {
  private browser: WebDriver | null = null; // Selenium
  private engineInstance: PWBrowser | null = null; // Playwright
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private running: boolean = false;
  private currentExecutionId: string | null = null;
  private screenshotDir: string;
  
  public onEvent: (event: any) => void;
  public onStatusChange: (status: AgentStatus) => void;

  constructor(options: { 
    onEvent?: (event: any) => void, 
    onStatusChange?: (status: AgentStatus) => void 
  } = {}) {
    this.onEvent = options.onEvent || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});
    this.screenshotDir = path.resolve(process.cwd(), automationConfig.screenshots.dir);

    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  /**
   * Execute a workflow by ID
   */
  async run(workflowId: string, overrideBrowser: string | null = null) {
    if (this.running) {
      throw new Error('Agent is already executing a workflow');
    }

    const workflow = await prisma.automationWorkflow.findUnique({
      where: { id: workflowId },
      include: { steps: { orderBy: { stepIndex: 'asc' } } }
    });

    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const steps = workflow.steps;
    if (steps.length === 0) {
      throw new Error('Workflow has no steps to execute');
    }

    // Determine target browser
    const workflowMeta = workflow.metadata ? JSON.parse(workflow.metadata) : {};
    let browserType = overrideBrowser || workflowMeta.browserType || 'chromium';
    
    if (browserType === 'ie' && process.platform !== 'win32') {
       console.warn('[Agent] IE execution requested on non-Windows platform. Falling back to Chromium.');
       browserType = 'chromium';
    }

    this.running = true;
    
    // Create execution log
    const execLog = await prisma.automationExecutionLog.create({
      data: {
        workflowId,
        workflowName: workflow.name,
        totalSteps: steps.length,
        status: 'running'
      }
    });
    this.currentExecutionId = execLog.id;

    this.onStatusChange({
      status: 'running',
      executionId: execLog.id,
      workflowId,
      totalSteps: steps.length,
      browserType
    });

    // Launch browser
    try {
      if (browserType === 'ie') {
        this.browser = await new Builder().forBrowser('internet explorer').build();
      } else {
        let engine: any;
        let launchOptions: any = {
          headless: automationConfig.browser.headless,
          slowMo: automationConfig.browser.slowMo || 100
        };

        if (browserType === 'firefox') engine = firefox;
        else if (browserType === 'webkit') engine = webkit;
        else if (browserType === 'chrome') { engine = chromium; launchOptions.channel = 'chrome'; }
        else if (browserType === 'msedge') { engine = chromium; launchOptions.channel = 'msedge'; }
        else engine = chromium;

        this.engineInstance = await engine.launch(launchOptions);
        this.context = await this.engineInstance!.newContext({
          viewport: automationConfig.browser.viewport
        });
        this.page = await this.context.newPage();
      }
    } catch (err: any) {
      this.running = false;
      await prisma.automationExecutionLog.update({
        where: { id: execLog.id },
        data: { status: 'error', errorMessage: err.message }
      });
      throw new Error(`Failed to launch ${browserType}: ${err.message}`);
    }

    let completedStepsCount = 0;
    let lastError: string | null = null;
    const stepResults: any[] = [];

    try {
      for (const step of steps) {
        if (!this.running) break;

        const stepResult = await this._executeStep(step, completedStepsCount + 1, steps.length, browserType);
        stepResults.push(stepResult);

        if (stepResult.status === 'success') {
          completedStepsCount++;
          await prisma.automationExecutionLog.update({
            where: { id: execLog.id },
            data: { completedSteps: completedStepsCount }
          });
        } else if (stepResult.status === 'failed') {
          lastError = stepResult.error || "Unknown Error";
          if (!automationConfig.replay.continueOnError) break;
        }

        if (automationConfig.replay.stepDelay > 0) {
          await this._delay(automationConfig.replay.stepDelay);
        }
      }

      const finalStatus = completedStepsCount === steps.length ? 'completed' : 'failed';

      await prisma.automationExecutionLog.update({
        where: { id: execLog.id },
        data: {
          status: finalStatus,
          completedSteps: completedStepsCount,
          completedAt: new Date(),
          errorMessage: lastError || undefined
        }
      });

      this.onStatusChange({
        status: finalStatus as any,
        executionId: execLog.id,
        workflowId,
        completedSteps: completedStepsCount,
        totalSteps: steps.length,
        error: lastError || undefined
      });

      return { executionId: execLog.id, status: finalStatus, completedSteps: completedStepsCount };

    } catch (err: any) {
      await prisma.automationExecutionLog.update({
        where: { id: execLog.id },
        data: { status: 'error', errorMessage: err.message, completedAt: new Date() }
      });
      throw err;
    } finally {
      await this._cleanup();
    }
  }

  /**
   * Stop execution and cleanup resources
   */
  async stop() {
    this.running = false;
    await this._cleanup();
    
    if (this.currentExecutionId) {
      await prisma.automationExecutionLog.update({
        where: { id: this.currentExecutionId },
        data: { status: 'cancelled', completedAt: new Date() }
      });
    }

    this.onStatusChange({
      status: 'cancelled',
      executionId: this.currentExecutionId || undefined
    });
  }

  /**
   * Get current engine status
   */
  getStatus(): AgentStatus {
    return {
      status: this.running ? 'running' : 'idle',
      executionId: this.currentExecutionId || undefined,
      browserType: this.browser ? 'ie' : (this.engineInstance ? 'playwright' : undefined)
    };
  }

  private async _executeStep(step: any, currentIndex: number, total: number, browserType: string) {
    const actionType = step.actionType;
    const selector = step.selector;
    const value = step.value;
    const label = step.aiLabel || `Step ${currentIndex}`;

    this.onEvent({
      type: 'step_executing',
      stepIndex: currentIndex,
      totalSteps: total,
      label,
      actionType
    });

    let lastError: string | null = null;
    const maxRetries = automationConfig.replay.retryCount || 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (browserType === 'ie') {
          await this._performSeleniumAction(actionType, selector, step.selectorType, value, step);
        } else {
          await this._performAction(actionType, selector, step.selectorType, value, step);
        }

        this.onEvent({
          type: 'step_completed',
          stepIndex: currentIndex,
          totalSteps: total,
          label,
          status: 'success'
        });

        return { stepIndex: currentIndex, label, status: 'success' };
      } catch (err: any) {
        lastError = err.message;
        if (attempt < maxRetries) {
          await this._delay(automationConfig.replay.retryDelay || 1000);
        }
      }
    }

    if (automationConfig.replay.screenshotOnError && browserType !== 'ie' && this.page) {
      try {
        const errScreenshot = path.join(this.screenshotDir, `error_${this.currentExecutionId}_step_${currentIndex}.png`);
        await this.page.screenshot({ path: errScreenshot, fullPage: true });
      } catch (e) {}
    }

    this.onEvent({
      type: 'step_failed',
      stepIndex: currentIndex,
      totalSteps: total,
      label,
      status: 'failed',
      error: lastError
    });

    return { stepIndex: currentIndex, label, status: 'failed', error: lastError };
  }

  private async _performSeleniumAction(actionType: string, selector: string, selectorType: string, value: string, step: any) {
    const timeout = automationConfig.browser.timeout;
    if (!this.browser) return;

    switch (actionType) {
      case 'navigate':
        await this.browser.get(value);
        break;
      case 'click':
      case 'dblclick': {
        const el = await this._findSeleniumElement(selector, selectorType, timeout);
        await el.click();
        break;
      }
      case 'type': {
        const el = await this._findSeleniumElement(selector, selectorType, timeout);
        await el.clear();
        await el.sendKeys(value);
        break;
      }
      case 'keypress': {
        const el = await this.browser.switchTo().activeElement();
        if (value === 'Enter') await el.sendKeys(Key.ENTER);
        else if (value === 'Escape') await el.sendKeys(Key.ESCAPE);
        else if (value === 'Tab') await el.sendKeys(Key.TAB);
        else await el.sendKeys(value);
        break;
      }
    }
  }

  private async _findSeleniumElement(selector: string, type: string, timeout: number) {
    if (!this.browser) throw new Error('Selenium browser not initialized');
    let by;
    if (type === 'id') by = By.id(selector.replace('#', ''));
    else if (type === 'xpath') by = By.xpath(selector);
    else by = By.css(selector);

    return await this.browser.wait(until.elementLocated(by), timeout);
  }

  private async _performAction(actionType: string, selector: string, selectorType: string, value: string, step: any) {
    if (!this.page) return;
    const timeout = automationConfig.browser.timeout;
    const metadata = step.metadata ? JSON.parse(step.metadata) : {};

    switch (actionType) {
      case 'navigate':
        if (value && value.startsWith('http')) {
          await this.page.goto(value, { waitUntil: 'domcontentloaded', timeout });
        }
        break;

      case 'click': {
        const el = await this._findElement(selector, selectorType, timeout);
        await el.click({ timeout });
        break;
      }

      case 'type': {
        const el = await this._findElement(selector, selectorType, timeout);
        await el.fill('');
        await el.type(value, { delay: 50 });
        break;
      }

      case 'select': {
        const el = await this._findElement(selector, selectorType, timeout);
        await el.selectOption(value);
        break;
      }

      case 'keypress': {
        const modKeys: string[] = [];
        if (metadata.modifiers?.meta) modKeys.push('Meta');
        if (metadata.modifiers?.ctrl) modKeys.push('Control');
        const keyCombo = [...modKeys, value].join('+');
        await this.page.keyboard.press(keyCombo);
        break;
      }

      case 'wait':
        await this._delay(parseInt(value) || 2000);
        break;

      case 'screenshot': {
        const screenshotPath = path.join(this.screenshotDir, `agent_${this.currentExecutionId}_${Date.now()}.png`);
        await this.page.screenshot({ path: screenshotPath });
        break;
      }
    }
  }

  private async _findElement(selector: string, selectorType: string, timeout: number) {
    if (!this.page) throw new Error('Page not initialized');
    const state = 'visible' as const;
    switch (selectorType) {
      case 'id': return await this.page.waitForSelector(selector, { timeout, state });
      case 'xpath': return await this.page.waitForSelector(`xpath=${selector}`, { timeout, state });
      case 'text': return await this.page.waitForSelector(selector.startsWith('text=') ? selector : `text=${selector}`, { timeout, state });
      default: return await this.page.waitForSelector(selector, { timeout, state });
    }
  }

  private async _cleanup() {
    this.running = false;
    try {
      if (this.browser) await this.browser.quit();
      if (this.engineInstance) await this.engineInstance.close();
    } catch (e) {}
    this.browser = null;
    this.engineInstance = null;
    this.context = null;
    this.page = null;
  }

  private _delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
