/**
 * Automation Studio — Recorder Engine (TypeScript)
 * Ported for Next Gen
 */

import { chromium, firefox, webkit, Browser, BrowserContext, Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import { prisma } from '@/lib/prisma';
import { EVENT_CAPTURE_SCRIPT } from './event-capture';
import { SelectorGenerator } from './selector-generator';
import { StepNamer } from './step-namer';
import { automationConfig } from './config';

export interface RecorderStatus {
  status: 'idle' | 'recording' | 'stopped';
  workflowId?: string;
  url?: string;
  stepCount?: number;
}

export class RecorderEngine {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private recording: boolean = false;
  private workflowId: string | null = null;
  private stepIndex: number = 0;
  private stepNamer: StepNamer;
  private screenshotDir: string;
  
  public onEvent: (event: any) => void;
  public onStatusChange: (status: RecorderStatus) => void;

  constructor(options: { 
    onEvent?: (event: any) => void, 
    onStatusChange?: (status: RecorderStatus) => void 
  } = {}) {
    this.stepNamer = new StepNamer('heuristic'); // Can be linked to Next Gen logic later
    this.onEvent = options.onEvent || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});
    this.screenshotDir = path.resolve(process.cwd(), automationConfig.screenshots.dir);

    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  /**
   * Start a new recording session
   */
  async start({ url, workflowName = 'Untitled Workflow', browserType = 'chromium', customerId, tenantId }: {
    url: string,
    workflowName?: string,
    browserType?: string,
    customerId?: string,
    tenantId?: string
  }) {
    if (this.recording) {
      throw new Error('Recording already in progress');
    }

    // 1. Create workflow record in Prisma
    const workflow = await prisma.automationWorkflow.create({
      data: {
        name: workflowName,
        description: `Recorded from ${url} (${browserType})`,
        targetUrl: url,
        status: 'recording',
        customerId,
        tenantId,
        metadata: JSON.stringify({ browserType })
      }
    });
    this.workflowId = workflow.id;
    this.stepIndex = 0;
    this.recording = true;

    // 2. Launch browser
    console.log(`[Recorder] Launching ${browserType}...`);
    
    let engine: any;
    let launchOptions: any = {
      headless: automationConfig.browser.headless,
      slowMo: automationConfig.browser.slowMo
    };

    if (browserType === 'firefox') engine = firefox;
    else if (browserType === 'webkit') engine = webkit;
    else if (browserType === 'chrome') { engine = chromium; launchOptions.channel = 'chrome'; }
    else if (browserType === 'msedge') { engine = chromium; launchOptions.channel = 'msedge'; }
    else engine = chromium;

    this.browser = await engine.launch(launchOptions);
    this.context = await this.browser!.newContext({
      viewport: automationConfig.browser.viewport
    });
    this.page = await this.context.newPage();

    // 3. Setup hooks
    await this.page.exposeFunction('__recorderAgent__sendEvent', async (eventJson: string) => {
      try {
        const event = JSON.parse(eventJson);
        await this._processEvent(event);
      } catch (err: any) {
        console.error('[Recorder] Error processing event:', err.message);
      }
    });

    await this.page.addInitScript(EVENT_CAPTURE_SCRIPT);

    this.page.on('framenavigated', async (frame) => {
      if (frame === this.page?.mainFrame()) {
        const navUrl = frame.url();
        if (navUrl !== 'about:blank' && navUrl !== url) {
          await this._processEvent({
            type: 'navigate',
            timestamp: Date.now(),
            elementInfo: { tagName: 'PAGE', pageUrl: navUrl },
            url: navUrl
          });
        }
      }
    });

    this.page.on('close', () => {
      if (this.recording) this.stop();
    });

    // 4. Initial Navigation
    this.onStatusChange({ status: 'recording', workflowId: this.workflowId ?? undefined, url });
    
    await this._processEvent({
      type: 'navigate',
      timestamp: Date.now(),
      elementInfo: { tagName: 'PAGE', pageUrl: url },
      url: url
    });

    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: automationConfig.browser.timeout });

    return { workflowId: this.workflowId, status: 'recording', url };
  }

  /**
   * Process a browser event and save as a step
   */
  private async _processEvent(event: any) {
    if (!this.recording || !this.workflowId) return;

    this.stepIndex++;
    const elementInfo = event.elementInfo || {};
    const selectors = SelectorGenerator.generateSelectors(elementInfo);
    const bestSelector = selectors.best;

    const stepData: any = {
      stepIndex: this.stepIndex,
      actionType: event.type,
      selector: bestSelector.selector,
      selectorType: bestSelector.type,
      value: event.value || event.key || event.url || '',
      url: elementInfo.pageUrl || '',
      elementInfo,
      metadata: {
        coordinates: event.coordinates,
        scrollPosition: event.scrollPosition,
        modifiers: event.modifiers,
        selectedText: event.selectedText,
        formData: event.formData,
        selectorAlternatives: selectors.alternatives.slice(0, 3),
        confidence: bestSelector.confidence,
        strategy: bestSelector.strategy,
        timestamp: event.timestamp
      }
    };

    // AI Naming
    stepData.aiLabel = await this.stepNamer.nameStep(stepData);

    // Screenshot
    if (automationConfig.recording.captureScreenshots && this.page && !this.page.isClosed()) {
      try {
        const screenshotFileName = `${this.workflowId}_step_${this.stepIndex}.png`;
        const screenshotPath = path.join(this.screenshotDir, screenshotFileName);
        await this.page.screenshot({ path: screenshotPath, type: 'png' });
        stepData.metadata.screenshotUrl = `/automation/screenshots/${screenshotFileName}`;
      } catch (err) {}
    }

    // Prisma Save
    await prisma.automationStep.create({
      data: {
        workflowId: this.workflowId,
        stepIndex: this.stepIndex,
        actionType: stepData.actionType,
        selector: stepData.selector,
        selectorType: stepData.selectorType,
        value: stepData.value,
        aiLabel: stepData.aiLabel,
        metadata: JSON.stringify(stepData.metadata)
      }
    });

    // Notify Dashboard
    this.onEvent({
      type: 'step_recorded',
      step: {
        ...stepData,
        elementInfo: undefined
      }
    });

    if (this.stepIndex >= automationConfig.recording.maxSteps) {
      await this.stop();
    }
  }

  /**
   * Stop recording
   */
  async stop() {
    if (!this.recording || !this.workflowId) {
      return { status: 'idle' };
    }

    this.recording = false;
    
    await prisma.automationWorkflow.update({
      where: { id: this.workflowId },
      data: { status: 'ready' }
    });

    try {
      if (this.browser) await this.browser.close();
    } catch (err) {}

    this.browser = null;
    this.context = null;
    this.page = null;

    this.onStatusChange({ status: 'stopped', workflowId: this.workflowId, stepCount: this.stepIndex });

    return { workflowId: this.workflowId, status: 'ready', stepCount: this.stepIndex };
  }

  getStatus(): RecorderStatus {
    return {
      status: this.recording ? 'recording' : 'idle',
      workflowId: this.workflowId || undefined,
      stepCount: this.stepIndex
    };
  }
}
