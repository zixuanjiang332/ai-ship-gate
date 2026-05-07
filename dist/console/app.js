// src/console/browser/main.ts
var defaultChecks = {
  tests: true,
  dependencies: true,
  env: true,
  ci: true,
  docker: true,
  security: true
};
var currentResult = null;
var selectedFindingIndex = 0;
if (typeof document !== "undefined") {
  void bootstrap();
}
async function bootstrap() {
  bindRunAction();
  try {
    setRunStatus("Loading demo report\u2026");
    const result = await requestJson("/api/demo");
    renderResult(result);
    setRunStatus("Demo ready.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load demo data.";
    renderLoadError(message);
  }
}
function bindRunAction() {
  document.querySelector("#switch-run")?.addEventListener("click", () => {
    revealRunPanel();
  });
  document.querySelector("#run-check")?.addEventListener("click", () => {
    void handleRun();
  });
}
async function handleRun() {
  const errorNode = document.querySelector("#run-error");
  const button = document.querySelector("#run-check");
  const request = readRunRequest();
  if (!request.repoPath) {
    revealRunPanel();
    showRunError("Enter a local repository path before running a check.");
    return;
  }
  if (errorNode) {
    errorNode.hidden = true;
    errorNode.textContent = "";
  }
  if (button) {
    button.disabled = true;
  }
  setRunStatus("Running local check\u2026");
  try {
    const result = await requestJson("/api/run", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(request)
    });
    renderResult(result);
    revealRunPanel(false);
    setRunStatus(
      `Ready. Last run reviewed ${result.findingsCount} finding${result.findingsCount === 1 ? "" : "s"} in ${result.repoPath}.`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Run failed.";
    showRunError(message);
    setRunStatus("Run failed.");
  } finally {
    if (button) {
      button.disabled = false;
    }
  }
}
function readRunRequest() {
  const repoPath = document.querySelector("#repo-path")?.value.trim() ?? "";
  const base = document.querySelector("#base-ref")?.value.trim() ?? "";
  const failOn = document.querySelector('input[name="fail-on"]:checked')?.value === "warn" ? "warn" : "fail";
  const checks = { ...defaultChecks };
  for (const input of document.querySelectorAll("input[data-check]")) {
    const checkName = input.dataset.check;
    if (checkName) {
      checks[checkName] = input.checked;
    }
  }
  return {
    repoPath,
    ...base ? { base } : {},
    failOn,
    checks
  };
}
function renderResult(result) {
  currentResult = result;
  const priorityIndexes = getPriorityFindingIndexes(result);
  selectedFindingIndex = priorityIndexes[0] ?? 0;
  const modeIndicator = document.querySelector("#mode-indicator");
  if (modeIndicator) {
    modeIndicator.textContent = result.source === "demo" ? "Demo data" : "Local run";
  }
  renderSummary(result);
  renderFindings(result);
  renderFileMap(result);
  renderDetail(result, selectedFindingIndex);
}
function renderSummary(result) {
  const statusNode = document.querySelector("#summary-status");
  const metricsNode = document.querySelector("#summary-metrics");
  if (!statusNode || !metricsNode) {
    return;
  }
  const releaseSummary = buildReleaseSummary(result);
  const priorityLead = buildPriorityLead(result);
  statusNode.innerHTML = `
    <div class="verdict-badge verdict-${result.verdict}">${result.verdict.toUpperCase()}</div>
    <div class="status-copy">
      <p class="status-label">${result.source === "demo" ? "Review Desk Demo" : "Local Review Result"}</p>
      <h2>${escapeHtml(releaseSummary)}</h2>
      <p class="status-next">${escapeHtml(priorityLead)}</p>
      <p class="status-context">
        ${escapeHtml(result.repoPath)} \xB7 Base ref: <strong>${escapeHtml(result.baseRef)}</strong> \xB7 Fail on: <strong>${escapeHtml(result.effectiveConfig.failOn)}</strong>
      </p>
    </div>
  `;
  metricsNode.innerHTML = [
    renderMetric("Findings", String(result.findingsCount)),
    renderMetric("Fail", String(result.counts.fail)),
    renderMetric("Warn", String(result.counts.warn)),
    renderMetric("Info", String(result.counts.info)),
    renderMetric("Files", String(result.affectedFilesCount))
  ].join("");
}
function renderFindings(result) {
  const findingsNode = document.querySelector("#findings");
  const findingCountLabel = document.querySelector("#finding-count-label");
  if (!findingsNode || !findingCountLabel) {
    return;
  }
  findingCountLabel.textContent = `${result.findingsCount} findings across ${result.affectedFilesCount} files. Start with the highlighted item, then work down the queue.`;
  if (result.findings.length === 0) {
    findingsNode.innerHTML = `<div class="empty-state"><h3>No findings</h3><p>No release risks detected for this run.</p></div>`;
    return;
  }
  const priorityIndexes = getPriorityFindingIndexes(result);
  findingsNode.innerHTML = priorityIndexes.map((findingIndex, queueIndex) => {
    const finding = result.findings[findingIndex];
    const active = findingIndex === selectedFindingIndex ? " is-active" : "";
    const featured = queueIndex === 0 ? " is-featured" : "";
    const cue = queueIndex === 0 ? "Review first" : queueIndex === 1 ? "Review next" : queueIndex === 2 ? "Follow-up" : "Queued";
    return `
        <button class="finding-row${active}${featured}" type="button" data-finding-index="${findingIndex}">
          <div class="finding-row-top">
            <span class="finding-severity severity-${finding.severity}">${finding.severity.toUpperCase()}</span>
            <span class="finding-cue">${cue}</span>
          </div>
          <strong>${escapeHtml(finding.title)}</strong>
          <span class="finding-rule">${escapeHtml(finding.id)}</span>
          <span class="finding-files">${escapeHtml(finding.files.join(", "))}</span>
        </button>
      `;
  }).join("");
  for (const button of findingsNode.querySelectorAll("[data-finding-index]")) {
    button.addEventListener("click", () => {
      const rawIndex = button.dataset.findingIndex;
      selectedFindingIndex = rawIndex ? Number(rawIndex) : 0;
      if (currentResult) {
        renderFindings(currentResult);
        renderDetail(currentResult, selectedFindingIndex);
      }
    });
  }
}
function renderDetail(result, index) {
  const detailNode = document.querySelector("#detail");
  const subtitleNode = document.querySelector("#detail-subtitle");
  if (!detailNode || !subtitleNode) {
    return;
  }
  const finding = result.findings[index];
  if (!finding) {
    subtitleNode.textContent = "Nothing selected.";
    detailNode.innerHTML = `<div class="empty-state"><h3>No finding selected</h3><p>The current run does not have any findings to inspect.</p></div>`;
    return;
  }
  const priorityIndexes = getPriorityFindingIndexes(result);
  const priorityPosition = priorityIndexes.indexOf(index);
  subtitleNode.textContent = `Priority ${priorityPosition + 1} \xB7 Rule ${finding.id} \xB7 ${finding.files.length} file${finding.files.length === 1 ? "" : "s"} touched`;
  const matchingFiles = result.files.filter((file) => finding.files.includes(file.path));
  detailNode.innerHTML = `
    <div class="detail-header">
      <span class="finding-severity severity-${finding.severity}">${finding.severity.toUpperCase()}</span>
      <h3>${escapeHtml(finding.title)}</h3>
    </div>
    <div class="detail-block">
      <h4>Why it matters</h4>
      <p class="detail-message">${escapeHtml(finding.message)}</p>
    </div>
    <div class="detail-block">
      <h4>Touched files</h4>
      <ul class="detail-list">
        ${finding.files.map((file) => `<li>${escapeHtml(file)}</li>`).join("")}
      </ul>
    </div>
    <div class="detail-block">
      <h4>Suggested next action</h4>
      <p>${escapeHtml(finding.suggestion)}</p>
    </div>
    <div class="detail-block">
      <h4>Evidence from the diff</h4>
      ${matchingFiles.length > 0 ? matchingFiles.map(
    (file) => `
                  <div class="snippet-card">
                    <div class="snippet-header">
                      <strong>${escapeHtml(file.path)}</strong>
                      <span>${escapeHtml(file.status)}</span>
                    </div>
                    <pre>${escapeHtml(file.snippet)}</pre>
                  </div>
                `
  ).join("") : `<p>No diff snippet is available for this finding.</p>`}
    </div>
  `;
}
function renderFileMap(result) {
  const fileMapNode = document.querySelector("#file-map");
  if (!fileMapNode) {
    return;
  }
  const fileEntries = buildFileMap(result);
  if (fileEntries.length === 0) {
    fileMapNode.innerHTML = `<div class="empty-state"><h3>No file mapping</h3><p>No affected files were reported for this run.</p></div>`;
    return;
  }
  fileMapNode.innerHTML = fileEntries.map(
    ([file, data]) => `
        <section class="file-entry">
          <header>
            <strong>${escapeHtml(file)}</strong>
            <span>${data.findings.length} finding${data.findings.length === 1 ? "" : "s"}</span>
          </header>
          <p class="file-status">${escapeHtml(data.status)}</p>
          <pre>${escapeHtml(data.snippet)}</pre>
          <ul>
            ${data.findings.map(
      (finding) => `
                  <li>
                    <span class="severity-dot severity-${finding.severity}"></span>
                    <span>${escapeHtml(finding.title)}</span>
                  </li>
                `
    ).join("")}
          </ul>
        </section>
      `
  ).join("");
}
function buildFileMap(result) {
  const findingsById = new Map(result.findings.map((finding) => [finding.id, finding]));
  return result.files.map((file) => {
    const entry = [
      file.path,
      {
        status: file.status,
        snippet: file.snippet,
        findings: file.matchedFindingIds.map((id) => findingsById.get(id)).filter((finding) => Boolean(finding))
      }
    ];
    return entry;
  }).sort((left, right) => right[1].findings.length - left[1].findings.length || left[0].localeCompare(right[0]));
}
function getPriorityFindingIndexes(result) {
  return result.findings.map((finding, index) => ({ finding, index })).sort(
    (left, right) => severityRank(right.finding.severity) - severityRank(left.finding.severity) || left.index - right.index
  ).map((entry) => entry.index);
}
function buildReleaseSummary(result) {
  if (result.verdict === "fail") {
    const hasSecretRisk = result.findings.some((finding) => finding.id === "security.secret-in-diff");
    const failLabel = hasSecretRisk ? "credential risk" : "fail-severity risk";
    return `Release is blocked by ${result.counts.fail} ${failLabel}${result.counts.fail === 1 ? "" : "s"} and ${result.counts.warn} follow-up warning${result.counts.warn === 1 ? "" : "s"}.`;
  }
  if (result.verdict === "warn") {
    return `Release is still open, but ${result.counts.warn} warning${result.counts.warn === 1 ? "" : "s"} should be reviewed before merge.`;
  }
  return "Release is clear. No deterministic risks were found in this change set.";
}
function buildPriorityLead(result) {
  const priorityIndex = getPriorityFindingIndexes(result)[0];
  const priorityFinding = priorityIndex !== void 0 ? result.findings[priorityIndex] : void 0;
  if (!priorityFinding) {
    return "No triage queue is needed for this run. The evidence workspace is clear.";
  }
  const followUpCount = Math.max(result.findingsCount - 1, 0);
  return `Start with ${priorityFinding.title.toLowerCase()}, then move through ${followUpCount} follow-up item${followUpCount === 1 ? "" : "s"} while the evidence stays open beside you.`;
}
function severityRank(severity) {
  switch (severity) {
    case "fail":
      return 3;
    case "warn":
      return 2;
    default:
      return 1;
  }
}
function renderLoadError(message) {
  showRunError(message);
  setRunStatus("Demo unavailable.");
  const summaryNode = document.querySelector("#summary-status");
  const metricsNode = document.querySelector("#summary-metrics");
  const findingsNode = document.querySelector("#findings");
  const detailNode = document.querySelector("#detail");
  const fileMapNode = document.querySelector("#file-map");
  if (summaryNode) {
    summaryNode.innerHTML = `<div class="empty-state"><h2>Unable to load console data</h2><p>${escapeHtml(message)}</p></div>`;
  }
  if (metricsNode) {
    metricsNode.innerHTML = "";
  }
  if (findingsNode) {
    findingsNode.innerHTML = "";
  }
  if (detailNode) {
    detailNode.innerHTML = "";
  }
  if (fileMapNode) {
    fileMapNode.innerHTML = "";
  }
}
function renderMetric(label, value) {
  return `
    <div class="metric">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}
function setRunStatus(message) {
  const statusNode = document.querySelector("#run-status");
  if (statusNode) {
    statusNode.textContent = message;
  }
}
function showRunError(message) {
  const errorNode = document.querySelector("#run-error");
  if (!errorNode) {
    return;
  }
  revealRunPanel();
  errorNode.hidden = false;
  errorNode.textContent = message;
}
function revealRunPanel(shouldFocus = true) {
  const panel = document.querySelector("#run-band");
  if (panel) {
    panel.hidden = false;
  }
  if (shouldFocus) {
    document.querySelector("#repo-path")?.focus();
  }
}
async function requestJson(input, init) {
  const response = await fetch(input, init);
  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();
  if (!response.ok) {
    if (payload && typeof payload === "object" && "error" in payload) {
      throw new Error(String(payload.error));
    }
    throw new Error(typeof payload === "string" && payload ? payload : "Request failed.");
  }
  return payload;
}
function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
export {
  buildReleaseSummary,
  getPriorityFindingIndexes
};
//# sourceMappingURL=app.js.map
