export class TabSwitchDetectionMonitor {
  private onViolation: (type: string, details: string) => void;
  private handleVisibility: () => void;
  private handleBlur: () => void;
  private handleCopy: (e: Event) => void;
  private handlePaste: (e: Event) => void;
  private handleContextMenu: (e: Event) => void;
  private switchCount = 0;

  constructor(onViolation: (type: string, details: string) => void) {
    this.onViolation = onViolation;

    this.handleVisibility = () => {
      if (document.hidden) {
        this.switchCount++;
        this.onViolation("tab_switch", `Tab switched (count: ${this.switchCount})`);
      }
    };

    this.handleBlur = () => {
      this.switchCount++;
      this.onViolation("browser_switch", `Browser focus lost (count: ${this.switchCount})`);
    };

    this.handleCopy = (e: Event) => {
      e.preventDefault();
      this.onViolation("copy_paste", "Copy attempt detected");
    };

    this.handlePaste = (e: Event) => {
      e.preventDefault();
      this.onViolation("copy_paste", "Paste attempt detected");
    };

    this.handleContextMenu = (e: Event) => {
      e.preventDefault();
      this.onViolation("right_click", "Right-click attempt detected");
    };
  }

  start() {
    document.addEventListener("visibilitychange", this.handleVisibility);
    window.addEventListener("blur", this.handleBlur);
    document.addEventListener("copy", this.handleCopy);
    document.addEventListener("paste", this.handlePaste);
    document.addEventListener("contextmenu", this.handleContextMenu);
  }

  stop() {
    document.removeEventListener("visibilitychange", this.handleVisibility);
    window.removeEventListener("blur", this.handleBlur);
    document.removeEventListener("copy", this.handleCopy);
    document.removeEventListener("paste", this.handlePaste);
    document.removeEventListener("contextmenu", this.handleContextMenu);
  }

  getSwitchCount(): number {
    return this.switchCount;
  }
}
