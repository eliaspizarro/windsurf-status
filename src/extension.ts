import * as vscode from "vscode";
import https from "https";

const STATUS_URL = "https://status.windsurf.com/api/v2/status.json";
const SUMMARY_URL = "https://status.windsurf.com/api/v2/summary.json";
const CHECK_INTERVAL_MS = 1 * 60 * 1000; // 1 minuto

let lastIndicator: string | null = null;
let lastError = false;
let initialized = false;
let lastIncidentIds = new Set<string>();
let lastMaintenanceIds = new Set<string>();

function fetchStatus(): Promise<any> {
    return new Promise((resolve, reject) => {
        const req = https.get(STATUS_URL, { timeout: 10000 }, res => {
            let data = "";

            res.on("data", chunk => {
                data += chunk;
            });

            res.on("end", () => {
                try {
                    resolve(JSON.parse(data));
                } catch {
                    reject(new Error("Invalid JSON response"));
                }
            });
        });

        req.on("timeout", () => {
            req.destroy();
            reject(new Error("Request timeout"));
        });

        req.on("error", reject);
    });
}

function buildIdSet(items: Array<{ id?: string }>): Set<string> {
    return new Set(items.map(item => item.id).filter((id): id is string => Boolean(id)));
}

function fetchSummary(): Promise<any> {
    return new Promise((resolve, reject) => {
        const req = https.get(SUMMARY_URL, { timeout: 10000 }, res => {
            let data = "";

            res.on("data", chunk => {
                data += chunk;
            });

            res.on("end", () => {
                try {
                    resolve(JSON.parse(data));
                } catch {
                    reject(new Error("Invalid JSON response"));
                }
            });
        });

        req.on("timeout", () => {
            req.destroy();
            reject(new Error("Request timeout"));
        });

        req.on("error", reject);
    });
}

async function checkStatus() {
    try {
        const statusData = await fetchStatus();
        const summaryData = await fetchSummary();

        const indicator = statusData.status?.indicator;
        const description = statusData.status?.description;
        const incidents = Array.isArray(summaryData.incidents) ? summaryData.incidents : [];
        const maintenances = Array.isArray(summaryData.scheduled_maintenances)
            ? summaryData.scheduled_maintenances
            : [];

        const validIndicators = new Set(["none", "minor", "major", "critical", "maintenance"]);

        if (!indicator || !validIndicators.has(indicator)) {
            if (!lastError) {
                lastError = true;

                vscode.window.showErrorMessage(
                    "Invalid Windsurf status (assuming DOWN)"
                );
            }
            return;
        }

        if (lastError) {
            lastError = false;

            vscode.window.showInformationMessage(
                "Windsurf status service reachable again"
            );
        }

        if (indicator !== lastIndicator) {
            lastIndicator = indicator;

            if (indicator !== "none") {
                vscode.window.showErrorMessage(
                    `Windsurf status: ${description}`
                );
            }
        }

        const currentIncidentIds = buildIdSet(incidents);
        const currentMaintenanceIds = buildIdSet(maintenances);

        if (!initialized) {
            lastIncidentIds = currentIncidentIds;
            lastMaintenanceIds = currentMaintenanceIds;
            initialized = true;
            return;
        }

        for (const incident of incidents) {
            if (incident?.id && !lastIncidentIds.has(incident.id)) {
                vscode.window.showWarningMessage(
                    `New incident: ${incident.name} (${incident.status})`
                );
            }
        }

        for (const maintenance of maintenances) {
            if (maintenance?.id && !lastMaintenanceIds.has(maintenance.id)) {
                vscode.window.showInformationMessage(
                    `New maintenance: ${maintenance.name} (${maintenance.status})`
                );
            }
        }

        lastIncidentIds = currentIncidentIds;
        lastMaintenanceIds = currentMaintenanceIds;

    } catch {
        if (!lastError) {
            lastError = true;

            vscode.window.showErrorMessage(
                "Unable to reach Windsurf status service"
            );
        }
    }
}

export function activate(context: vscode.ExtensionContext) {
    checkStatus();

    const timer = setInterval(checkStatus, CHECK_INTERVAL_MS);

    context.subscriptions.push({
        dispose: () => clearInterval(timer)
    });
}

export function deactivate() {}
