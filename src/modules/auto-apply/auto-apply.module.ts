import AutoApplyService from "./auto-apply.service.ts";
import AutoApplyWorker from "./auto-apply.worker.ts";

const autoApplyService = new AutoApplyService();
const autoApplyWorker = new AutoApplyWorker(autoApplyService);

export { autoApplyService };