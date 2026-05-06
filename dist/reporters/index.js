import { renderJson } from "./json.js";
import { renderMarkdown } from "./markdown.js";
import { renderSarif } from "./sarif.js";
import { renderTerminal } from "./terminal.js";
export function renderReport(report, format) {
    if (format === "json")
        return renderJson(report);
    if (format === "markdown")
        return renderMarkdown(report);
    if (format === "sarif")
        return renderSarif(report);
    return renderTerminal(report);
}
//# sourceMappingURL=index.js.map