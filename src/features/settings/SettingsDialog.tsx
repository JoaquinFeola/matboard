import { Monitor, Moon, Sun } from 'lucide-solid';
import { For, type JSX } from 'solid-js';
import { BACKGROUND_KINDS } from '@/core/model/board';
import { settings, updateSettings } from '@/state/settings';
import { BackgroundSwatch, BACKGROUND_LABELS } from '@/ui/BackgroundSwatch';
import { Segmented } from '@/ui/Button';
import { Dialog } from '@/ui/Dialog';

const SHORTCUTS: readonly [string, string][] = [
  ['Seleccionar / Mano', 'V / H'],
  ['Pluma / Lápiz / Resaltador / Goma', 'P / B / M / E'],
  ['Rectángulo / Elipse / Línea / Flecha', 'R / O / L / A'],
  ['Texto', 'T'],
  ['Mover la vista', 'Espacio + arrastrar'],
  ['Deshacer / Rehacer', 'Ctrl+Z / Ctrl+Y'],
  ['Borrar selección', 'Supr'],
  ['Seleccionar todo', 'Ctrl+A'],
  ['Copiar / Cortar / Pegar', 'Ctrl+C / Ctrl+X / Ctrl+V'],
  ['Duplicar', 'Ctrl+D'],
  ['Acercar / Alejar / 100%', 'Ctrl + / Ctrl − / Ctrl 0'],
  ['Ver todo', 'Shift+1'],
  ['Nueva pizarra (inicio)', 'Ctrl+N'],
];

export function SettingsDialog(props: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={props.open} title="Configuración" onClose={props.onClose} width="max-w-lg">
      <div class="flex flex-col gap-5">
        <Row label="Tema">
          <Segmented
            value={settings.theme}
            onChange={(theme) => updateSettings({ theme })}
            options={[
              { value: 'light', label: 'Claro', icon: <Sun size={14} /> },
              { value: 'dark', label: 'Oscuro', icon: <Moon size={14} /> },
              { value: 'system', label: 'Sistema', icon: <Monitor size={14} /> },
            ]}
          />
        </Row>
        <Row label="Rueda del mouse" hint="Con Ctrl siempre hace zoom">
          <Segmented
            value={settings.wheelMode}
            onChange={(wheelMode) => updateSettings({ wheelMode })}
            options={[
              { value: 'pan', label: 'Desplazar' },
              { value: 'zoom', label: 'Zoom' },
            ]}
          />
        </Row>
        <Row label="Con el dedo" hint="El lápiz siempre dibuja">
          <Segmented
            value={settings.touchMode}
            onChange={(touchMode) => updateSettings({ touchMode })}
            options={[
              { value: 'navigate', label: 'Navegar' },
              { value: 'draw', label: 'Dibujar' },
            ]}
          />
        </Row>
        <Row label="Fondo por defecto">
          <div class="flex gap-1.5">
            <For each={BACKGROUND_KINDS}>
              {(kind) => (
                <button
                  type="button"
                  data-tip={BACKGROUND_LABELS[kind]}
                  aria-label={BACKGROUND_LABELS[kind]}
                  class={`rounded-lg p-0.5 ${settings.defaultBackground === kind ? 'ring-2 ring-accent' : ''}`}
                  onClick={() => updateSettings({ defaultBackground: kind })}
                >
                  <BackgroundSwatch kind={kind} class="h-8 w-10" />
                </button>
              )}
            </For>
          </div>
        </Row>

        <div>
          <h3 class="mb-2 text-[13px] font-semibold">Atajos de teclado</h3>
          <dl class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 rounded-xl bg-surface-2 p-3 text-[13px]">
            <For each={SHORTCUTS}>
              {([action, keys]) => (
                <>
                  <dt class="text-muted">{action}</dt>
                  <dd class="text-right font-medium">{keys}</dd>
                </>
              )}
            </For>
          </dl>
        </div>
      </div>
    </Dialog>
  );
}

function Row(props: { label: string; hint?: string; children: JSX.Element }) {
  return (
    <div class="flex items-center justify-between gap-4">
      <div>
        <div class="text-[13px] font-medium">{props.label}</div>
        {props.hint && <div class="text-xs text-muted">{props.hint}</div>}
      </div>
      {props.children}
    </div>
  );
}
