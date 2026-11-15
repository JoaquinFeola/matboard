import { createSignal, Match, Switch } from 'solid-js';
import { HomeScreen } from '@/features/boards/HomeScreen';
import { EditorScreen } from '@/features/editor/EditorScreen';
import { SettingsDialog } from '@/features/settings/SettingsDialog';
import { ToastProvider } from '@/ui/Toast';

type Route = { screen: 'home' } | { screen: 'board'; id: string };

export function App() {
  const [route, setRoute] = createSignal<Route>({ screen: 'home' });
  const [settingsOpen, setSettingsOpen] = createSignal(false);
  const openSettings = () => setSettingsOpen(true);

  return (
    <ToastProvider>
      <Switch>
        <Match when={route().screen === 'home'}>
          <HomeScreen onOpenBoard={(id) => setRoute({ screen: 'board', id })} onOpenSettings={openSettings} />
        </Match>
        <Match when={route().screen === 'board' && (route() as { id: string }).id} keyed>
          {(id) => (
            <EditorScreen boardId={id} onBack={() => setRoute({ screen: 'home' })} onOpenSettings={openSettings} />
          )}
        </Match>
      </Switch>
      <SettingsDialog open={settingsOpen()} onClose={() => setSettingsOpen(false)} />
    </ToastProvider>
  );
}
