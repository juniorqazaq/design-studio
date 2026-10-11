import React from 'react';
import {createRoot} from 'react-dom/client';
import './tokens.css';
import './app.css';
function App(){const [message,setMessage]=React.useState('');return <main><nav><strong>Fieldwork</strong><button onClick={()=>{document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';}}>Toggle theme</button></nav><h1>A real React application.</h1><p>This fixture consumes semantic CSS variables. Launch Design Studio in this project to preview temporary changes, or apply the config to src/tokens.css.</p><section><span className="badge">Connected locally</span><h2>A clear starting point</h2><p>Your components keep their structure. Their tokens change.</p><button className="primary" onClick={()=>setMessage('Working button — no data sent.')}>Start a project</button><button onClick={()=>setMessage('Secondary action selected.')}>Explore resources</button><p role="status">{message}</p><label>Work email <input type="email" placeholder="you@company.com"/></label></section><a href="https://example.com">Example resource</a></main>}
createRoot(document.getElementById('root')).render(<App/>);
