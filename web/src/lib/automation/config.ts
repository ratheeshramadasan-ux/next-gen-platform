/**
 * Automation Studio — Configuration
 */

export const automationConfig = {
  browser: {
    headless: false,
    slowMo: 50,
    timeout: 30000,
    viewport: {
      width: 1280,
      height: 800
    }
  },
  recording: {
    maxSteps: 100,
    captureScreenshots: true
  },
  replay: {
    retryCount: 3,
    retryDelay: 1000,
    stepDelay: 1000,
    continueOnError: false,
    screenshotOnError: true
  },
  screenshots: {
    dir: "./public/automation/screenshots"
  }
};
