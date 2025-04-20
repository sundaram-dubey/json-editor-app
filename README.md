# JSON Editor PRO

A powerful desktop application for editing, validating, and analyzing JSON files with tree view, schema validation, and AI-powered features.

<img width="1728" alt="Screenshot 2025-04-20 at 10 56 20" src="https://github.com/user-attachments/assets/f4fdc654-035c-4612-ac34-ac27b1dee17f" />
<img width="1728" alt="Screenshot 2025-04-20 at 10 56 36" src="https://github.com/user-attachments/assets/de0cfc20-54d1-424d-80f8-f53475a0daf1" />
<img width="1728" alt="Screenshot 2025-04-20 at 10 56 46" src="https://github.com/user-attachments/assets/f6caf202-6874-48fc-ae03-9605707330ae" />
<img width="1728" alt="Screenshot 2025-04-20 at 10 57 31" src="https://github.com/user-attachments/assets/ed8d2221-217f-4ffd-9441-f98fce489579" />
<img width="1728" alt="Screenshot 2025-04-20 at 10 58 52" src="https://github.com/user-attachments/assets/fc5ce66f-1543-419e-af7f-b8b72d30e10d" />



### AI Feature
<img width="1728" alt="Screenshot 2025-04-20 at 10 49 58" src="https://github.com/user-attachments/assets/9acb47e3-3bf7-4956-af20-f1dbce3f3054" />
 <img width="1728" alt="Screenshot 2025-04-20 at 10 49 52" src="https://github.com/user-attachments/assets/79b27470-2d19-4edc-a977-fe4219d49c1d" />
<img width="1728" alt="Screenshot 2025-04-20 at 10 49 35" src="https://github.com/user-attachments/assets/b3a70fed-54f5-4a99-a7de-8b8f49382b99" />
<img width="1728" alt="Screenshot 2025-04-20 at 11 09 52" src="https://github.com/user-attachments/assets/bc6a61fe-7328-47fa-be30-1732061e5945" />
<img width="1728" alt="Screenshot 2025-04-20 at 11 13 52" src="https://github.com/user-attachments/assets/c31583a3-c74d-427b-a1e4-1c202b0991ff" />



## Features

### Core Features
- JSON editing with syntax highlighting and error detection
- Format and compress JSON for readability or storage optimization
- Validate JSON syntax with detailed error reporting
- Tree view navigation for complex JSON structures
- Powerful search with regex and case-sensitive options
- File management with quick access to recent files
- Compare JSON files to identify differences
- Schema validation with comprehensive error reporting
- Generate JSON Schema from current JSON

### AI-Powered Features
- Explain JSON structure and purpose
- Fix invalid JSON automatically
- Smart natural language search
- AI-enhanced schema generation
- Mock data generation based on text descriptions

## How to Use

### File Operations

#### Creating a New File
- Click the "New" button in the toolbar
- Use keyboard shortcut: Cmd+N (Mac) / Ctrl+N (Windows/Linux)

#### Opening a File
- Click the "Open" button in the toolbar
- Use keyboard shortcut: Cmd+O (Mac) / Ctrl+O (Windows/Linux)
- Options:
  - **Open File**: Open a single JSON file
  - **File Explorer**: Browse and manage multiple files

#### Saving Files
- **Save**: Click the "Save" button or use Cmd+S (Mac) / Ctrl+S (Windows/Linux)
- **Save As**: Use Cmd+Shift+S (Mac) / Ctrl+Shift+S (Windows/Linux)

#### Import/Export
- **Import from Clipboard**: Menu > File > Import from Clipboard or Cmd+Shift+I
- **Export to Clipboard**: Menu > File > Export to Clipboard or Cmd+Shift+E

### JSON Manipulation

#### Formatting JSON
- Click the "Format" button in the toolbar
- Use keyboard shortcut: Cmd+Shift+F (Mac) / Ctrl+Shift+F (Windows/Linux)
- Result: JSON will be properly indented and formatted for readability

#### Compressing JSON
- Click the "Compress" button in the toolbar
- Use keyboard shortcut: Cmd+Shift+C (Mac) / Ctrl+Shift+C (Windows/Linux)
- Result: All whitespace will be removed for minimal file size

#### Validating JSON
- Click the "Validate" button in the toolbar
- Use keyboard shortcut: Cmd+Shift+V (Mac) / Ctrl+Shift+V (Windows/Linux)
- Options:
  - **Validate JSON**: Basic syntax validation
  - **Schema Validation**: Validate against JSON Schema

### Tree View Navigation

#### Toggle Tree View
- Click the "Tree View" button in the toolbar
- Use keyboard shortcut: Cmd+T (Mac) / Ctrl+T (Windows/Linux)

#### Tree View Controls
- **Expand All**: Expand all nodes in the tree (Cmd+] / Ctrl+])
- **Collapse All**: Collapse all nodes in the tree (Cmd+[ / Ctrl+[)
- **Copy Path**: Copy the JSON path to the selected node

#### Interacting with Tree View
- Click on any node to highlight it in the editor
- Right-click on a node to access context menu options:
  - Explain this key (AI feature)
  - Copy path

### Search Functionality

#### Opening Search
- Click the "Find" button in the toolbar
- Use keyboard shortcut: Cmd+F (Mac) / Ctrl+F (Windows/Linux)

#### Search Options
- **Case Sensitive**: Toggle to make search case-sensitive
- **Regex**: Enable regular expression search
- Navigate results with Up/Down buttons or Enter/Shift+Enter

### Schema Validation

#### Basic Validation
1. Click the "Validate" button in the toolbar
2. Select "Validate JSON" from the dropdown
3. A modal will show validation results, including any syntax errors

#### Schema Validation Modal
1. Click the "Validate" button in the toolbar
2. Select "Schema Validation" from the dropdown
3. In the modal that appears:
   - Left panel: Enter or paste your JSON Schema
   - Right panel: Enter JSON or use "Use Current" to import from editor
   - Click "Validate" to see results in the bottom panel
   - All panels have copy buttons for easy sharing

#### Generate Schema
1. Menu > Schema > Generate Schema from Current JSON
2. Alternatively, use the AI-enhanced schema generator from AI Tools menu

#### Validate Against Schema
- Menu > Schema > Validate Against Schema
- Validates the current JSON against the previously loaded schema

### JSON Comparison

#### Compare JSONs
1. Click the "Compare" button in the toolbar
2. Use keyboard shortcut: Cmd+Shift+D (Mac) / Ctrl+Shift+D (Windows/Linux)
3. In the modal:
   - Load JSON into both panels (from file, clipboard, or current editor)
   - Click "Compare" to see differences highlighted
   - Results show added, removed, and changed properties

### AI Features

#### Accessing AI Tools
- Click the "AI Tools" button in the toolbar
- Requires setting up a Gemini API key in Settings

#### Available AI Tools
1. **Explain JSON**: Get a natural language explanation of your JSON structure
2. **Fix JSON**: Automatically detect and fix syntax errors in invalid JSON
3. **Smart Search**: Search your JSON using natural language queries
4. **Generate Schema**: Create an enhanced JSON Schema with descriptions and validations
5. **Generate Mock Data**: Create test data based on text descriptions

#### Context-Specific AI Features
- Right-click on any node in the tree view to "Explain this key"

### Settings and Customization

#### Accessing Settings
- Click the settings icon (gear) in the toolbar

#### Available Settings
- **AI Features**: Add your Gemini API key for AI functionality
- **Editor Settings**: Change theme and font size

## Keyboard Shortcuts

| Action | Shortcut (Mac) | Shortcut (Windows/Linux) |
|--------|----------------|--------------------------|
| New File | Cmd+N | Ctrl+N |
| Open File | Cmd+O | Ctrl+O |
| Save | Cmd+S | Ctrl+S |
| Save As | Cmd+Shift+S | Ctrl+Shift+S |
| Format JSON | Cmd+Shift+F | Ctrl+Shift+F |
| Compress JSON | Cmd+Shift+C | Ctrl+Shift+C |
| Validate JSON | Cmd+Shift+V | Ctrl+Shift+V |
| Find | Cmd+F | Ctrl+F |
| Toggle Tree View | Cmd+T | Ctrl+T |
| Compare JSONs | Cmd+Shift+D | Ctrl+Shift+D |
| Expand All | Cmd+] | Ctrl+] |
| Collapse All | Cmd+[ | Ctrl+[ |
| Import from Clipboard | Cmd+Shift+I | Ctrl+Shift+I |
| Export to Clipboard | Cmd+Shift+E | Ctrl+Shift+E |
| Toggle File Explorer | Cmd+E | Ctrl+E |

## Development

### Setup

```bash
# Install dependencies
npm install

# Run the app
npm start
```

### Building the App

```bash
# Package the app for macOS
npm run package
```

## Customizing App Icon

To update the application icon:

1. Replace the SVG file in `build/icons/icon.svg` with your own design
2. Convert the SVG to various PNG sizes using an online converter like [SVG to PNG Converter](https://svgtopng.com/)
3. Save the main icon as `build/icons/icon.png` (1024x1024 pixels recommended)
4. For macOS, create an .icns file using the converted PNG files
5. Update the `icon` path in `package.json` and `main.js` if needed
6. Rebuild the application

### macOS Icon Sizes

For macOS .icns file, you'll need the following sizes:
- 16x16
- 32x32
- 64x64
- 128x128
- 256x256
- 512x512
- 1024x1024

## License

MIT 
