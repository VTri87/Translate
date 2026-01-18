const WEBHOOK_URL = "https://vtri87.app.n8n.cloud/webhook-test/translate";

const inputText = document.getElementById("inputText");
const outputText = document.getElementById("outputText");
const translateBtn = document.getElementById("translateBtn");
const clearBtn = document.getElementById("clearBtn");
const speakBtn = document.getElementById("speakBtn");
const statusEl = document.getElementById("status");
const detectedEl = document.getElementById("detected");
const langFromEl = document.getElementById("langFrom");
const langToEl = document.getElementById("langTo");
const swapBtn = document.getElementById("swapBtn");

let direction = "de-vi";
let lastTargetLang = "vi";

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.style.color = isError ? "var(--danger)" : "var(--muted)";
}

function setDetected(source, target) {
  if (source && target) {
    detectedEl.textContent = `Detected: ${source.toUpperCase()} -> ${target.toUpperCase()}`;
  } else {
    detectedEl.textContent = "";
  }
}

function swapLanguages() {
  direction = direction === "de-vi" ? "vi-de" : "de-vi";
  const from = direction === "de-vi" ? "Deutsch" : "Vietnamesisch";
  const to = direction === "de-vi" ? "Vietnamesisch" : "Deutsch";
  langFromEl.textContent = from;
  langToEl.textContent = to;
}

function pickVoiceForLang(langCode) {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const langTag = langCode === "vi" ? "vi" : "de";
  return (
    voices.find(v => v.lang?.toLowerCase().startsWith(langTag)) ||
    voices.find(v => v.lang?.toLowerCase().includes(langTag)) ||
    null
  );
}

async function translateText() {
  const text = inputText.value.trim();
  if (!text) {
    setStatus("Bitte Text eingeben.", true);
    return;
  }

  setStatus("Uebersetze...");
  setDetected("", "");

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });

    if (!res.ok) {
      const msg = await res.text();
      setStatus(`Fehler: ${res.status} ${msg}`, true);
      return;
    }

    const data = await res.json();
    if (data.error) {
      setStatus(`Fehler: ${data.error}`, true);
      if (data.raw) {
        outputText.value = data.raw;
      }
      return;
    }

    outputText.value = data.translated || "";
    lastTargetLang = data.target || (direction === "de-vi" ? "vi" : "de");
    setDetected(data.source, data.target);
    setStatus("Fertig");
  } catch (err) {
    setStatus("Fehler: Verbindung fehlgeschlagen.", true);
  }
}

function clearAll() {
  inputText.value = "";
  outputText.value = "";
  setDetected("", "");
  setStatus("Bereit");
}

function speak() {
  const text = outputText.value.trim();
  if (!text) {
    setStatus("Keine Uebersetzung zum Vorlesen.", true);
    return;
  }

  if (!("speechSynthesis" in window)) {
    setStatus("Text-to-Speech wird im Browser nicht unterstuetzt.", true);
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lastTargetLang === "vi" ? "vi-VN" : "de-DE";

  const voice = pickVoiceForLang(lastTargetLang);
  if (voice) {
    utterance.voice = voice;
  }

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

translateBtn.addEventListener("click", translateText);
clearBtn.addEventListener("click", clearAll);
speakBtn.addEventListener("click", speak);
swapBtn.addEventListener("click", swapLanguages);

inputText.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    translateText();
  }
});

window.speechSynthesis.onvoiceschanged = () => {
  pickVoiceForLang(lastTargetLang);
};

setStatus("Bereit");