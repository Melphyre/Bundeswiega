import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { BRAND_COLOR } from '../constants';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode?: boolean;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  darkMode = false
}) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = 'https://bundeswiega.vercel.app';
  const shareTitle = '1. Bundeswiega';
  const shareText = 'Tritt an beim 1. Bundeswiega – Das ultimative Präzisions-Wiegespiel für echte Bierkenner! 🍻🎯';

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        });
      } catch (err) {
        // User canceled or failed
      }
    } else {
      handleCopyLink();
    }
  };

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;

  return (
    <div
      className="fixed inset-0 z-[950] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-6 border-2 relative animate-in zoom-in-95 ${
          darkMode
            ? 'bg-slate-900 border-slate-700 text-white'
            : 'bg-white border-slate-200 text-gray-900'
        }`}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-4 border-gray-500/20">
          <div className="flex items-center space-x-2.5">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-lg shadow-sm"
              style={{ backgroundColor: BRAND_COLOR }}
            >
              <i className="fas fa-share-alt"></i>
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight">
                Spiel teilen
              </h3>
              <p className="text-xs opacity-60">Lade Freunde an die Wiege ein</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer font-bold text-lg"
          >
            ✕
          </button>
        </div>

        {/* QR Code Presentation */}
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="p-4 rounded-3xl bg-white shadow-xl border-4 border-teal-500/30 flex items-center justify-center">
            <QRCodeSVG
              value={shareUrl}
              size={180}
              level="M"
              includeMargin={false}
            />
          </div>
          <p className="text-xs font-bold opacity-60 text-center">
            QR-Code scannen, um direkt zur App zu gelangen
          </p>
        </div>

        {/* Link Copy Box */}
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-wider opacity-60">
            Web-Adresse kopieren
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className={`flex-1 p-3 rounded-xl border text-xs font-mono font-bold select-all ${
                darkMode ? 'bg-slate-800 border-slate-700 text-teal-400' : 'bg-gray-100 border-gray-300 text-teal-700'
              }`}
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className={`px-4 py-3 rounded-xl font-black text-xs uppercase tracking-wider text-white transition-all shadow-md active:scale-95 cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                copied ? 'bg-emerald-600' : ''
              }`}
              style={!copied ? { backgroundColor: BRAND_COLOR } : {}}
            >
              <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
              <span>{copied ? 'Kopiert!' : 'Kopieren'}</span>
            </button>
          </div>
        </div>

        {/* Social Media Share Buttons */}
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-wider opacity-60">
            Teilen über
          </label>
          <div className="grid grid-cols-3 gap-2">
            {/* WhatsApp */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex flex-col items-center justify-center space-y-1 shadow-md transition-transform active:scale-95"
            >
              <i className="fab fa-whatsapp text-lg"></i>
              <span>WhatsApp</span>
            </a>

            {/* Telegram */}
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs flex flex-col items-center justify-center space-y-1 shadow-md transition-transform active:scale-95"
            >
              <i className="fab fa-telegram-plane text-lg"></i>
              <span>Telegram</span>
            </a>

            {/* X / Twitter */}
            <a
              href={twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs flex flex-col items-center justify-center space-y-1 shadow-md transition-transform active:scale-95"
            >
              <i className="fab fa-x-twitter text-lg"></i>
              <span>X / Twitter</span>
            </a>
          </div>

          {/* Web Share API Button for mobile/supported browsers */}
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              type="button"
              onClick={handleNativeShare}
              className={`w-full py-3 rounded-xl border-2 font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-2 mt-2 ${
                darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-gray-300 hover:bg-gray-100'
              }`}
            >
              <i className="fas fa-share-nodes"></i>
              <span>System-Menü zum Teilen öffnen</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
