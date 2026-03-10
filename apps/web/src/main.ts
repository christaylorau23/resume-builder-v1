import { Header } from "@repo/ui/header";
import "./style.css";
import typescriptLogo from "/typescript.svg";
import { Counter } from "@repo/ui/counter";
import { setupCounter } from "@repo/ui/setup-counter";
import { renderSettings, attachSettingsListeners } from "./settings";
import { renderPipeline, attachPipelineListeners } from "./pipeline";

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <div>
    <a href="https://vitejs.dev" target="_blank">
      <img src="/vite.svg" class="logo" alt="Vite logo" />
    </a>
    <a href="https://www.typescriptlang.org/" target="_blank">
      <img src="${typescriptLogo}" class="logo vanilla" alt="TypeScript logo" />
    </a>
    ${Header({ title: "Resume Builder" })}
    ${renderSettings()}
    ${renderPipeline()}
    <div class="card">
      ${Counter()}
    </div>
  </div>
`;

attachSettingsListeners(app);
attachPipelineListeners(app);
setupCounter(document.querySelector<HTMLButtonElement>("#counter")!);
