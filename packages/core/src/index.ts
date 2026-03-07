// Headless entry point — exports ONLY runPipeline.
// Do not add other pipeline, layout-prep, or rendering exports here.
// CLI and Web apps depend solely on this function and @repo/types.
export { runPipeline } from './pipeline/run-pipeline';
