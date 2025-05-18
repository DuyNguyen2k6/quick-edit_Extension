# Quick Edit Extension

A simple browser extension that allows you to quickly edit the content of any web page directly from the page itself.

**Live Demo:** [quickedit.netlify.app](https://quickedit.netlify.app)

---

## Features

* **Inline Editing**: Click on any text on the page to edit it directly.
* **Custom Styling**: Apply custom CSS styles to elements on the fly.
* **Persist Changes**: (Optional) Save your edits for future sessions (work in progress).
* **Lightweight**: Less than 50KB packed, minimal dependencies.

---

## Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/DuyNguyen2k6/quick-edit_Extension.git
   ```
2. Open Chrome (or any Chromium-based browser) and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (toggle in the top right).
4. Click **Load unpacked** and select the cloned directory.
5. The **Quick Edit** icon will appear in your toolbar.

---

## Usage

1. Navigate to any web page.
2. Click the **Quick Edit** toolbar icon to activate editing mode.
3. Click on any text element to make it editable.
4. Press **Enter** or click outside the element to save your changes.
5. (If implemented) Click the **Save** button in the popup to persist changes.

---

## File Structure

* `manifest.json` - Extension metadata and permissions.
* `background.js`  - Handles browser events and extension lifecycle.
* `content.js`     - Injects editing functionality into web pages.
* `styles.css`     - Default styles for editable elements and popup UI.

---

## Contributing

Contributions are welcome! Please open an issue or submit a pull request:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/my-feature`).
3. Make your changes and commit (`git commit -m 'Add feature'`).
4. Push to the branch (`git push origin feature/my-feature`).
5. Open a pull request.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
