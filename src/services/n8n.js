import { config } from '../config.js';

async function safeFetch(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    return null;
  }
}

export async function classifyIncident(message) {
  if (!config.n8n.incidentUrl) return null;
  
  try {
    const response = await safeFetch(config.n8n.incidentUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    
    if (!response || !response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function generateDocSummary(docName, docContent = null) {
  if (!config.n8n.docUrl) return null;
  
  try {
    const response = await safeFetch(config.n8n.docUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docName, docContent }),
    });
    
    if (!response || !response.ok) return null;
    const data = await response.json();
    return data.summary || data.text || null;
  } catch {
    return null;
  }
}

export async function generateReportSummary(messages, hours, lang = 'pt') {
  if (!config.n8n.reportUrl) return null;
  
  try {
    const response = await safeFetch(config.n8n.reportUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, hours, lang }),
    }, 15000);
    
    if (!response || !response.ok) return null;
    const data = await response.json();
    return data.summary || data.text || null;
  } catch {
    return null;
  }
}

