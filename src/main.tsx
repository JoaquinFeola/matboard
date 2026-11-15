import { render } from 'solid-js/web';
import { App } from './App';
import './styles/index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Falta #root en index.html');
render(() => <App />, root);
