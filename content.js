// Chèn CSS snackbar vào trang
(function insertSnackbarCSS() {
  const style = document.createElement("style");
  style.textContent = `
    #snackbar {
      visibility: hidden;
      min-width: 250px;
      background-color: #323232;
      color: #fff;
      text-align: center;
      border-radius: 8px;
      padding: 14px 24px;
      position: fixed;
      left: 50%;
      bottom: 30px;
      font-size: 16px;
      transform: translateX(-50%);
      z-index: 1000001;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      opacity: 0;
      transition: opacity 0.4s ease, visibility 0.4s;
    }
    #snackbar.show {
      visibility: visible;
      opacity: 1;
    }
  `;
  document.head.appendChild(style);
})();

// Hàm hiện snackbar
function showSnackbar(message, duration = 3000) {
  let snackbar = document.getElementById("snackbar");
  if (snackbar) {
    snackbar.remove();
  }

  snackbar = document.createElement("div");
  snackbar.id = "snackbar";
  snackbar.textContent = message;

  document.body.appendChild(snackbar);

  setTimeout(() => {
    snackbar.classList.add("show");
  }, 100);

  setTimeout(() => {
    snackbar.classList.remove("show");
    setTimeout(() => {
      if (snackbar.parentNode) snackbar.parentNode.removeChild(snackbar);
    }, 400);
  }, duration + 100);
}

// Lắng nghe message từ background để mở popup
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data && event.data.type === "OPEN_QUICK_EDIT") {
    const selectedText = event.data.text;
    if (!selectedText) return;

    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);

    createEditorPopup(selectedText, range);
  }
});

function sanitizeText(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.textContent;
}

function replaceTextInRange(range, newText) {
  const startNode = range.startContainer;
  const endNode = range.endContainer;
  const startOffset = range.startOffset;
  const endOffset = range.endOffset;

  if (startNode === endNode && startNode.nodeType === Node.TEXT_NODE) {
    const originalText = startNode.textContent;
    startNode.textContent =
      originalText.substring(0, startOffset) +
      newText +
      originalText.substring(endOffset);
  } else {
    const commonAncestor = range.commonAncestorContainer;
    const walker = document.createTreeWalker(
      commonAncestor,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) =>
          range.intersectsNode(node)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_SKIP,
      }
    );

    let node;
    const nodesToUpdate = [];
    while ((node = walker.nextNode())) {
      nodesToUpdate.push(node);
    }

    nodesToUpdate.forEach((textNode, index) => {
      if (index === 0) {
        textNode.textContent =
          textNode.textContent.substring(0, startOffset) + newText;
      } else if (index === nodesToUpdate.length - 1) {
        textNode.textContent = textNode.textContent.substring(endOffset);
      } else {
        textNode.textContent = "";
      }
    });

    nodesToUpdate.forEach((node) => {
      if (node.textContent === "" && node.parentNode) {
        node.parentNode.removeChild(node);
      }
    });
  }
}

function createEditorPopup(selectedText, range) {
  const existing = document.getElementById("html-quick-edit-popup");
  if (existing) existing.remove();

  // Kiểm tra giao diện sáng hay tối
  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  const popup = document.createElement("div");
  popup.id = "html-quick-edit-popup";

  Object.assign(popup.style, {
    position: "fixed",
    zIndex: "1000000",
    background: isDarkMode ? "#121212" : "#f9f9f9",
    color: isDarkMode ? "#e0e0e0" : "#1c1c1c",
    borderRadius: "16px",
    boxShadow: isDarkMode
      ? "0 6px 20px rgba(0,0,0,0.8)"
      : "0 6px 20px rgba(0,0,0,0.15)",
    padding: "20px",
    minWidth: "380px",
    maxWidth: "90vw",
    maxHeight: "70vh",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%) scale(0.9)",
    opacity: "0",
    transition: "opacity 0.3s ease, transform 0.3s ease",
    display: "flex",
    flexDirection: "column",
    fontFamily:
      "SF Pro Text, -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    userSelect: "text",
  });

  // Header
  const header = document.createElement("div");
  header.textContent = "Quick Edit by DuyNguyen2k6";
  Object.assign(header.style, {
    fontWeight: "700",
    fontSize: "18px",
    marginBottom: "15px",
    textAlign: "center",
    cursor: "move",
    userSelect: "none",
    color: isDarkMode ? "#ddd" : "#1c1c1e",
    letterSpacing: "0.05em",
  });
  popup.appendChild(header);

  // Textarea
  const textarea = document.createElement("textarea");
  textarea.value = selectedText;
  Object.assign(textarea.style, {
    flexGrow: "1",
    width: "100%",
    borderRadius: "16px",
    border: isDarkMode ? "1.5px solid #555" : "1.5px solid #d1d1d6",
    backgroundColor: isDarkMode ? "#222" : "#ffffff",
    color: isDarkMode ? "#eee" : "#1c1c1e",
    fontSize: "16px",
    fontFamily: "inherit",
    padding: "15px",
    resize: "vertical",
    outline: "none",
    transition: "border-color 0.3s ease",
    boxSizing: "border-box",
    minHeight: "130px",
  });
  textarea.oninput = () => {
    textarea.style.borderColor = isDarkMode ? "#90caf9" : "#007aff";
    setTimeout(() => {
      textarea.style.borderColor = isDarkMode ? "#555" : "#d1d1d6";
    }, 500);
  };
  textarea.onkeydown = (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      textarea.value =
        textarea.value.substring(0, start) + "\n" + textarea.value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 1;
    }
  };
  popup.appendChild(textarea);

  // Info text
  const infoText = document.createElement("div");
  infoText.textContent = "Press Enter to save, Escape to cancel, Tab for new line.";
  Object.assign(infoText.style, {
    marginTop: "12px",
    fontSize: "12px",
    color: isDarkMode ? "#999" : "#8e8e93",
    textAlign: "center",
    userSelect: "none",
  });
  popup.appendChild(infoText);

  // Keyboard shortcuts
  popup.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      saveChanges();
    } else if (e.key === "Escape") {
      popup.remove();
    }
  });

  function saveChanges() {
    try {
      const cleanedText = sanitizeText(textarea.value);
      replaceTextInRange(range, cleanedText);

      // Hiện snackbar báo thành công
      showSnackbar("Changes saved!");

      popup.remove();
    } catch (error) {
      showSnackbar("Error saving changes.");
      console.error(error);
    }
  }

  // Drag & drop logic
  let isDragging = false,
    currentX = 0,
    currentY = 0,
    initialX = 0,
    initialY = 0;

  header.addEventListener("mousedown", (e) => {
    isDragging = true;
    initialX = e.clientX - currentX;
    initialY = e.clientY - currentY;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });

  function onMouseMove(e) {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      const popupRect = popup.getBoundingClientRect();
      const maxX = window.innerWidth - popupRect.width;
      const maxY = window.innerHeight - popupRect.height;
      currentX = Math.max(0, Math.min(currentX, maxX));
      currentY = Math.max(0, Math.min(currentY, maxY));
      popup.style.left = `${currentX}px`;
      popup.style.top = `${currentY}px`;
      popup.style.transform = "none";
    }
  }

  function onMouseUp() {
    isDragging = false;
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  }

  // Thêm popup vào DOM trước
  document.body.appendChild(popup);

  // Kích hoạt hiệu ứng popup fade + scale khi mở
  setTimeout(() => {
    popup.style.opacity = "1";
    popup.style.transform = "translate(-50%, -50%) scale(1)";
  }, 10);

  textarea.focus();
}

// Hàm hiện snackbar
function showSnackbar(message, duration = 3000) {
  let snackbar = document.getElementById("snackbar");
  if (snackbar) {
    snackbar.remove();
  }

  snackbar = document.createElement("div");
  snackbar.id = "snackbar";
  snackbar.textContent = message;

  // Chèn style snackbar nếu chưa có
  if (!document.getElementById("snackbar-style")) {
    const style = document.createElement("style");
    style.id = "snackbar-style";
    style.textContent = `
      #snackbar {
        visibility: hidden;
        min-width: 250px;
        background-color: #323232;
        color: #fff;
        text-align: center;
        border-radius: 8px;
        padding: 14px 24px;
        position: fixed;
        left: 50%;
        bottom: 30px;
        font-size: 16px;
        transform: translateX(-50%);
        z-index: 1000001;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        opacity: 0;
        transition: opacity 0.4s ease, visibility 0.4s;
      }
      #snackbar.show {
        visibility: visible;
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(snackbar);

  setTimeout(() => {
    snackbar.classList.add("show");
  }, 100);

  setTimeout(() => {
    snackbar.classList.remove("show");
    setTimeout(() => {
      if (snackbar.parentNode) snackbar.parentNode.removeChild(snackbar);
    }, 400);
  }, duration + 100);
}
