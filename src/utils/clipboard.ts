/**
 * Resilient clipboard writer that tries the async Clipboard API first
 * and falls back to an off-screen textarea + execCommand('copy')
 * for embedded iframe environments where clipboard permissions may be restricted.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to legacy execCommand fallback
    }
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);

    const selection = document.getSelection();
    const savedRanges: Range[] = [];
    if (selection) {
      for (let i = 0; i < selection.rangeCount; i++) {
        savedRanges.push(selection.getRangeAt(i).cloneRange());
      }
    }

    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);

    const succeeded = document.execCommand('copy');
    document.body.removeChild(textarea);

    // Restore prior user selection so highlighting isn't disrupted
    if (selection && savedRanges.length > 0) {
      selection.removeAllRanges();
      savedRanges.forEach((range) => selection.addRange(range));
    }

    return succeeded;
  } catch {
    return false;
  }
}
