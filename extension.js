
const vscode = require('vscode');

let autoAcceptInterval = null;
let enabled = true;
let statusBarItem;

function activate(context) {
    // Register toggle command
    let disposable = vscode.commands.registerCommand('unlimited.toggle', function () {
        enabled = !enabled;
        updateStatusBar();
        if (enabled) {
            vscode.window.showInformationMessage('Auto-Accept: ON');
        } else {
            vscode.window.showInformationMessage('Auto-Accept: OFF');
        }
    });
    context.subscriptions.push(disposable);

    try {
        statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10000);
        statusBarItem.command = 'unlimited.toggle';
        context.subscriptions.push(statusBarItem);

        updateStatusBar();
        statusBarItem.show();
    } catch (e) {
        // Silent failure
    }

    // Start the loop
    startLoop();
}

function updateStatusBar() {
    if (!statusBarItem) return;

    if (enabled) {
        statusBarItem.text = "$(check) Auto-Accept: ON";
        statusBarItem.tooltip = "Unlimited Auto-Accept is Executing (Click to Pause)";
        statusBarItem.backgroundColor = undefined;
    } else {
        statusBarItem.text = "$(circle-slash) Auto-Accept: OFF";
        statusBarItem.tooltip = "Unlimited Auto-Accept is Paused (Click to Resume)";
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }
}

// DOM-based auto-accept via Electron webContents
// This is the approach that works on Antigravity 1.18.4+ where
// the built-in VS Code commands were broken due to DOM changes.
function clickAcceptButtonViaDom() {
    try {
        const electron = require('electron');
        const windows = electron.BrowserWindow.getAllWindows();
        for (const win of windows) {
            win.webContents.executeJavaScript(`
                (() => {
                    const buttons = Array.from(document.querySelectorAll('button'));
                    const acceptBtn = buttons.find(b => b.textContent.includes('Accept')
                        || b.textContent.includes('Run')
                        || b.textContent.includes('Always Allow'));
                    if (acceptBtn) acceptBtn.click();
                })()
            `).catch(() => {});
        }
    } catch (e) {
        // Electron API not available, skip DOM approach
    }
}

// VS Code command-based auto-accept (original approach, still works on older versions)
async function clickAcceptButtonViaCommands() {
    const commands = [
        'antigravity.agent.acceptAgentStep',
        'antigravity.terminal.accept',
        'antigravity.agent.accept',
        'antigravity.acceptAll',
    ];
    for (const cmd of commands) {
        try {
            await vscode.commands.executeCommand(cmd);
        } catch (e) { }
    }
}

function startLoop() {
    autoAcceptInterval = setInterval(async () => {
        if (!enabled) return;

        // Method 1: DOM-based clicking (works on 1.18.4+)
        clickAcceptButtonViaDom();

        // Method 2: VS Code command-based (fallback for older versions)
        await clickAcceptButtonViaCommands();
    }, 1000);
}

function deactivate() {
    if (autoAcceptInterval) {
        clearInterval(autoAcceptInterval);
    }
}

module.exports = {
    activate,
    deactivate
}
