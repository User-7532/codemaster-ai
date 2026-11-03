import { useEffect, useRef, useState } from 'react';

// ブラウザの音声認識（Chrome など）で、話した内容を文字にする
export default function useSpeechInput({ onText }) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  const recRef = useRef(null);
  const keepRef = useRef(false);

  const supported =
    typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(
    () => () => {
      keepRef.current = false;
      try {
        recRef.current?.stop();
      } catch {
        /* 停止済みなら何もしない */
      }
    },
    []
  );

  const stop = () => {
    keepRef.current = false;
    try {
      recRef.current?.stop();
    } catch {
      /* 停止済みなら何もしない */
    }
    setListening(false);
    setInterim('');
  };

  const toggle = () => {
    if (listening) {
      stop();
      return;
    }
    if (!supported) {
      setError('このブラウザは音声入力に対応していません。Chrome などでお試しください。');
      return;
    }

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new Recognition();
    rec.lang = 'ja-JP';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let rest = '';
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const result = e.results[i];
        if (result.isFinal) onText(result[0].transcript);
        else rest += result[0].transcript;
      }
      setInterim(rest);
    };
    rec.onerror = (e) => {
      if (e.error === 'no-speech') return;
      setError(
        e.error === 'not-allowed' || e.error === 'service-not-allowed'
          ? 'マイクの使用が許可されていません。ブラウザの設定から許可してください。'
          : '音声を聞き取れませんでした。もう一度お試しください。'
      );
      keepRef.current = false;
      setListening(false);
      setInterim('');
    };
    rec.onend = () => {
      // 無音で止まったときは、続けて話せるように自動で再開する
      if (keepRef.current) {
        try {
          rec.start();
          return;
        } catch {
          /* 再開できなければ終了扱い */
        }
      }
      setListening(false);
      setInterim('');
    };

    recRef.current = rec;
    keepRef.current = true;
    setError('');
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  };

  return { supported, listening, interim, error, toggle, stop };
}