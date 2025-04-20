// ACE editor will be loaded via script tag in index.html

// Global variables
let currentFilePath = null;
let editor = null;
let isTreeViewVisible = false;
let currentSchema = null;
let searchResults = [];
let currentSearchIndex = -1;
let compareEditorA = null;
let compareEditorB = null;
let currentFolderPath = null;
let hasUnsavedChanges = false;
let isFileExplorerVisible = false;
let currentlyOpenedFile = null;

// AI Feature implementations
let geminiApiKey = localStorage.getItem('geminiApiKey') || '';
let selectedJsonPath = null;
let currentJsonKeyContext = null;

// Initialize ACE editor
function initEditor() {
  console.log('Initializing editor...');
  
  // Initialize the editor
  editor = ace.edit('editor');
  editor.setTheme('ace/theme/textmate');
  editor.session.setMode('ace/mode/json');
  editor.setOptions({
    enableBasicAutocompletion: true,
    enableLiveAutocompletion: true,
    showPrintMargin: false,
    fontSize: '14px',
    tabSize: 2,
    wrap: true
  });
  
  // Set default content
  editor.setValue('{\n  \n}', -1);
  
  // Focus the editor
  editor.focus();
  
  // Add change listeners for real-time validation
  editor.session.on('change', (e) => {
    hasUnsavedChanges = true;
    updateUnsavedIndicator();
    debounce(validateEditorContent, 500)();
  });
  
  // Add cursor change listener to update status bar
  editor.selection.on('changeCursor', updateCursorPosition);
  
  console.log('Editor initialized successfully');
}

// Debounce function to limit how often a function is called
function debounce(func, wait) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}

// Update cursor position in status bar
function updateCursorPosition() {
  const position = editor.getCursorPosition();
  document.getElementById('cursor-position').textContent = 
    `Line: ${position.row + 1}, Column: ${position.column + 1}`;
}

// Format JSON with proper indentation
function formatJSON() {
  if (!editor) return;
  
  try {
    const content = editor.getValue();
    const parsedJSON = JSON.parse(content);
    const formattedJSON = JSON.stringify(parsedJSON, null, 2);
    editor.setValue(formattedJSON, -1);
    updateStatus('JSON formatted successfully', 'success');
  } catch (error) {
    updateStatus(`Error formatting JSON: ${error.message}`, 'error');
  }
}

// Compress JSON by removing whitespace
function compressJSON() {
  if (!editor) return;
  
  try {
    const content = editor.getValue();
    const parsedJSON = JSON.parse(content);
    const compressedJSON = JSON.stringify(parsedJSON);
    editor.setValue(compressedJSON, -1);
    updateStatus('JSON compressed successfully', 'success');
  } catch (error) {
    updateStatus(`Error compressing JSON: ${error.message}`, 'error');
  }
}

// Validate JSON
function validateJSON(showModal = true) {
  console.log('Validating JSON, showModal:', showModal);
  if (!editor) return false;
  
  try {
    const content = editor.getValue();
    JSON.parse(content);
    updateStatus('JSON is valid', 'success');
    
    if (showModal) {
      console.log('Showing validation modal');
      document.getElementById('validationResults').textContent = '✅ JSON is valid';
      openModal('validationModal');
    }
    
    return true;
  } catch (error) {
    console.log('Validation error:', error.message);
    updateStatus(`Invalid JSON: ${error.message}`, 'error');
    
    if (showModal) {
      document.getElementById('validationResults').innerHTML = 
        `❌ <strong>Error:</strong> ${error.message}\n\n` +
        highlightErrorLocation(error, editor.getValue());
      openModal('validationModal');
    }
    
    return false;
  }
}

// Validate editor content for real-time feedback
function validateEditorContent() {
  if (!editor) return;
  
  try {
    const content = editor.getValue();
    if (content.trim() === '') return;
    
    JSON.parse(content);
    updateStatus('JSON is valid', 'success');
    
    // Clear any error annotations
    editor.session.clearAnnotations();
    
    // Validate against schema if available
    if (currentSchema) {
      validateAgainstSchema(false);
    }
  } catch (error) {
    updateStatus(`Invalid JSON: ${error.message}`, 'error');
    
    // Mark error in the editor
    const errorInfo = getErrorLocation(error);
    if (errorInfo) {
      editor.session.setAnnotations([{
        row: errorInfo.line - 1,
        column: errorInfo.column,
        text: error.message,
        type: 'error'
      }]);
    }
  }
}

// Get error location from JSON parse error
function getErrorLocation(error) {
  const errorMessage = error.message;
  const positionMatch = errorMessage.match(/at position (\d+)/);
  const lineColMatch = errorMessage.match(/line (\d+) column (\d+)/);
  
  if (lineColMatch) {
    return {
      line: parseInt(lineColMatch[1]),
      column: parseInt(lineColMatch[2])
    };
  } else if (positionMatch) {
    const position = parseInt(positionMatch[1]);
    const content = editor.getValue();
    const lines = content.substring(0, position).split('\n');
    return {
      line: lines.length,
      column: lines[lines.length - 1].length
    };
  }
  
  return null;
}

// Highlight error location in validation modal
function highlightErrorLocation(error, content) {
  const errorInfo = getErrorLocation(error);
  if (!errorInfo) return '';
  
  const lines = content.split('\n');
  let result = '';
  
  // Show a few lines before and after the error
  const startLine = Math.max(0, errorInfo.line - 3);
  const endLine = Math.min(lines.length, errorInfo.line + 2);
  
  for (let i = startLine; i < endLine; i++) {
    const lineNumber = i + 1;
    const isErrorLine = lineNumber === errorInfo.line;
    
    result += `${lineNumber}: ${lines[i]}\n`;
    if (isErrorLine) {
      // Add a marker under the error position
      const marker = ' '.repeat(errorInfo.column + lineNumber.toString().length + 1) + '^ Error here';
      result += `${marker}\n`;
    }
  }
  
  return result;
}

// Validate against JSON Schema
function validateAgainstSchema(showModal = true) {
  if (!editor || !currentSchema) return;
  
  try {
    const content = editor.getValue();
    const data = JSON.parse(content);
    
    // Use external JSON schema validation library (would normally be available)
    // For now, we'll use a simple validation to demonstrate
    let validationResult = simpleSchemaValidation(data, currentSchema);
    
    if (validationResult.valid) {
      updateStatus('Schema validation passed', 'success');
      
      if (showModal) {
        document.getElementById('schemaResults').textContent = '✅ Schema validation passed';
        openModal('schemaModal');
      }
    } else {
      updateStatus('Schema validation failed', 'warning');
      
      if (showModal) {
        let errorMessages = '❌ Schema validation failed:\n\n';
        validationResult.errors.forEach(error => {
          errorMessages += `- ${error.path}: ${error.message}\n`;
        });
        document.getElementById('schemaResults').textContent = errorMessages;
        openModal('schemaModal');
      }
    }
  } catch (error) {
    updateStatus(`Schema validation error: ${error.message}`, 'error');
    
    if (showModal) {
      document.getElementById('schemaResults').textContent = `❌ Error: ${error.message}`;
      openModal('schemaModal');
    }
  }
}

// Simple schema validation (placeholder for a real schema validator)
function simpleSchemaValidation(data, schema) {
  const result = { valid: true, errors: [] };
  
  try {
    // Check if root type matches
    if (schema.type) {
      const actualType = Array.isArray(data) ? 'array' : typeof data;
      if (actualType !== schema.type && !(schema.type === 'integer' && Number.isInteger(data))) {
        result.valid = false;
        result.errors.push({
          path: '$',
          message: `Expected ${schema.type}, got ${actualType}`
        });
      }
    }
    
    // Check required properties
    if (schema.required && typeof data === 'object') {
      schema.required.forEach(prop => {
        if (data[prop] === undefined) {
          result.valid = false;
          result.errors.push({
            path: `$.${prop}`,
            message: `Required property '${prop}' is missing`
          });
        }
      });
    }
    
    // Check properties
    if (schema.properties && typeof data === 'object') {
      Object.keys(schema.properties).forEach(prop => {
        if (data[prop] !== undefined) {
          const propSchema = schema.properties[prop];
          const propData = data[prop];
          
          // Check type
          if (propSchema.type) {
            const actualType = Array.isArray(propData) ? 'array' : typeof propData;
            if (actualType !== propSchema.type) {
              result.valid = false;
              result.errors.push({
                path: `$.${prop}`,
                message: `Expected ${propSchema.type}, got ${actualType}`
              });
            }
          }
        }
      });
    }
  } catch (error) {
    result.valid = false;
    result.errors.push({
      path: '$',
      message: `Schema validation error: ${error.message}`
    });
  }
  
  return result;
}

// Generate schema from current JSON
function generateSchema() {
  if (!editor) return;
  
  try {
    const content = editor.getValue();
    const data = JSON.parse(content);
    
    const schema = {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: Array.isArray(data) ? 'array' : 'object'
    };
    
    // For objects, generate properties schema
    if (typeof data === 'object' && !Array.isArray(data)) {
      schema.properties = {};
      schema.required = [];
      
      Object.keys(data).forEach(key => {
        schema.required.push(key);
        schema.properties[key] = getTypeSchema(data[key]);
      });
    }
    
    // For arrays, generate items schema if array is not empty
    if (Array.isArray(data) && data.length > 0) {
      // Use the first item as a reference
      schema.items = getTypeSchema(data[0]);
    }
    
    currentSchema = schema;
    updateStatus('Schema generated successfully', 'success');
    document.getElementById('schema-info').textContent = 'Schema: Generated from current JSON';
    
    // Show the schema
    document.getElementById('schemaResults').textContent = JSON.stringify(schema, null, 2);
    openModal('schemaModal');
  } catch (error) {
    updateStatus(`Error generating schema: ${error.message}`, 'error');
  }
}

// Get schema for a specific value
function getTypeSchema(value) {
  if (value === null) {
    return { type: 'null' };
  }
  
  const type = Array.isArray(value) ? 'array' : typeof value;
  const schema = { type };
  
  // For objects
  if (type === 'object') {
    schema.properties = {};
    schema.required = [];
    
    Object.keys(value).forEach(key => {
      schema.required.push(key);
      schema.properties[key] = getTypeSchema(value[key]);
    });
  }
  
  // For arrays
  if (type === 'array' && value.length > 0) {
    // Use the first item as a reference
    schema.items = getTypeSchema(value[0]);
  }
  
  return schema;
}

// Show a modal by ID
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'block';
  }
}

// Hide a modal by ID
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
  }
}

// Toggle search container visibility
function toggleSearch() {
  const searchContainer = document.getElementById('searchContainer');
  
  if (searchContainer.classList.contains('hidden')) {
    searchContainer.classList.remove('hidden');
    document.getElementById('searchInput').focus();
  } else {
    searchContainer.classList.add('hidden');
    editor.focus();
  }
}

// Perform search in JSON content
function performSearch() {
  if (!editor) return;
  
  const searchText = document.getElementById('searchInput').value;
  if (!searchText) return;
  
  const content = editor.getValue();
  const isCaseSensitive = document.getElementById('searchCaseSensitive').checked;
  const isRegex = document.getElementById('searchRegex').checked;
  
  try {
    searchResults = [];
    currentSearchIndex = -1;
    
    let searchRegex;
    if (isRegex) {
      searchRegex = new RegExp(searchText, isCaseSensitive ? 'g' : 'gi');
    } else {
      const escaped = searchText.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      searchRegex = new RegExp(escaped, isCaseSensitive ? 'g' : 'gi');
    }
    
    // Search in raw text
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let match;
      while ((match = searchRegex.exec(line)) !== null) {
        searchResults.push({
          row: i,
          column: match.index,
          end: match.index + match[0].length
        });
      }
    }
    
    // Update result count
    document.getElementById('searchResultsCount').textContent = 
      searchResults.length > 0 ? `${searchResults.length} results` : 'No results';
    
    // Navigate to first result if found
    if (searchResults.length > 0) {
      navigateToSearchResult(0);
    }
  } catch (error) {
    console.error('Search error:', error);
    document.getElementById('searchResultsCount').textContent = `Error: ${error.message}`;
  }
}

// Navigate to a specific search result
function navigateToSearchResult(index) {
  if (searchResults.length === 0 || index < 0 || index >= searchResults.length) return;
  
  currentSearchIndex = index;
  const result = searchResults[index];
  
  // Go to result position
  editor.gotoLine(result.row + 1, result.column, false);
  
  // Select the matched text
  editor.selection.setSelectionRange({
    start: { row: result.row, column: result.column },
    end: { row: result.row, column: result.end }
  });
  
  // Update result count display
  document.getElementById('searchResultsCount').textContent = 
    `${currentSearchIndex + 1} of ${searchResults.length}`;
}

// Navigate to next search result
function nextSearchResult() {
  if (searchResults.length === 0) return;
  
  const nextIndex = (currentSearchIndex + 1) % searchResults.length;
  navigateToSearchResult(nextIndex);
}

// Navigate to previous search result
function prevSearchResult() {
  if (searchResults.length === 0) return;
  
  const prevIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
  navigateToSearchResult(prevIndex);
}

// Generate tree view from JSON content
function updateTreeView() {
  const treeContainer = document.getElementById('json-tree');
  treeContainer.innerHTML = '';
  
  try {
    const content = editor.getValue();
    const parsedJSON = JSON.parse(content);
    
    // Create tree view
    const tree = document.createElement('div');
    tree.className = 'json-tree-root';
    
    function buildTreeNode(obj, parentElement, path = '$') {
      if (obj === null) {
        const nullNode = document.createElement('div');
        nullNode.className = 'json-tree-value json-tree-null';
        nullNode.textContent = 'null';
        // Add type hint
        const typeHint = document.createElement('span');
        typeHint.className = 'json-tree-type-hint';
        typeHint.textContent = 'null';
        nullNode.appendChild(typeHint);
        parentElement.appendChild(nullNode);
        return;
      }
      
      if (typeof obj === 'object') {
        const isArray = Array.isArray(obj);
        const keys = Object.keys(obj);
        
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          const value = obj[key];
          const nodePath = isArray ? `${path}[${key}]` : `${path}.${key}`;
          
          const nodeContainer = document.createElement('div');
          nodeContainer.className = 'json-tree-node';
          nodeContainer.dataset.path = nodePath;
          
          const nodeKey = document.createElement('span');
          nodeKey.className = 'json-tree-key';
          nodeKey.textContent = key;
          
          const nodeColon = document.createElement('span');
          nodeColon.className = 'json-tree-colon';
          nodeColon.textContent = ': ';
          
          nodeContainer.appendChild(nodeKey);
          nodeContainer.appendChild(nodeColon);
          
          if (typeof value === 'object' && value !== null) {
            const expandButton = document.createElement('span');
            expandButton.className = 'json-tree-expander expanded';
            expandButton.textContent = isArray ? '▼ [' : '▼ {';
            expandButton.onclick = function() {
              const childContent = this.nextElementSibling;
              if (childContent.style.display === 'none') {
                childContent.style.display = 'block';
                this.textContent = isArray ? '▼ [' : '▼ {';
                this.className = 'json-tree-expander expanded';
              } else {
                childContent.style.display = 'none';
                this.textContent = isArray ? '▶ [...]' : '▶ {...}';
                this.className = 'json-tree-expander collapsed';
              }
            };
            
            const childContent = document.createElement('div');
            childContent.className = 'json-tree-children';
            
            nodeContainer.appendChild(expandButton);
            nodeContainer.appendChild(childContent);
            
            buildTreeNode(value, childContent, nodePath);
            
            const closingBracket = document.createElement('span');
            closingBracket.className = 'json-tree-bracket';
            closingBracket.textContent = isArray ? ']' : '}';
            nodeContainer.appendChild(closingBracket);
            
            // Add type hint
            const typeHint = document.createElement('span');
            typeHint.className = 'json-tree-type-hint';
            typeHint.textContent = isArray ? 'array' : 'object';
            closingBracket.appendChild(typeHint);
            
          } else {
            const valueElement = document.createElement('span');
            valueElement.className = `json-tree-value json-tree-${typeof value}`;
            valueElement.textContent = typeof value === 'string' ? `"${value}"` : String(value);
            
            // Add type hint
            const typeHint = document.createElement('span');
            typeHint.className = 'json-tree-type-hint';
            typeHint.textContent = typeof value;
            valueElement.appendChild(typeHint);
            
            nodeContainer.appendChild(valueElement);
          }
          
          parentElement.appendChild(nodeContainer);
        }
      }
    }
    
    buildTreeNode(parsedJSON, tree);
    treeContainer.appendChild(tree);
    
    // Add click listeners to tree nodes to highlight in editor
    const treeNodes = treeContainer.querySelectorAll('.json-tree-node');
    treeNodes.forEach(node => {
      node.addEventListener('click', (e) => {
        if (e.target.classList.contains('json-tree-expander')) return;
        
        const path = node.dataset.path;
        if (path) {
          highlightJsonPath(path);
        }
      });
    });
    
  } catch (error) {
    treeContainer.innerHTML = `<div class="json-tree-error">Error generating tree view: ${error.message}</div>`;
  }
}

// Highlight JSON path in editor
function highlightJsonPath(path) {
  if (!editor) return;
  
  try {
    const content = editor.getValue();
    const json = JSON.parse(content);
    
    // Convert path to array of segments
    let segments = [];
    if (path === '$') {
      // Root path
      segments = [];
    } else if (path.startsWith('$.')) {
      segments = path.substring(2).split('.');
    } else if (path.startsWith('$[')) {
      const arrayMatch = path.match(/\$\[(\d+)\]/);
      if (arrayMatch) {
        segments = [arrayMatch[1]];
      }
    }
    
    // Navigate to object
    let currentObj = json;
    let currentPath = segments.slice(0, -1);
    for (const segment of currentPath) {
      // Handle array indices in path
      const arrayMatch = segment.match(/(\w+)\[(\d+)\]/);
      if (arrayMatch) {
        const [_, propName, index] = arrayMatch;
        currentObj = currentObj[propName][parseInt(index)];
      } else {
        currentObj = currentObj[segment];
      }
      
      if (currentObj === undefined) return;
    }
    
    // Get last segment - the property we want to find
    const lastSegment = segments[segments.length - 1];
    
    // Find the position in the text
    const jsonString = JSON.stringify(json, null, 2);
    const lines = jsonString.split('\n');
    
    // Simple property search - this is a basic implementation
    // A real implementation would use a JSON parser/pointer
    let targetLine = -1;
    let targetColumn = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const keyMatch = new RegExp(`"${lastSegment}"\\s*:`).exec(line);
      
      if (keyMatch) {
        targetLine = i;
        targetColumn = keyMatch.index;
        break;
      }
    }
    
    if (targetLine !== -1) {
      // Navigate to property in editor
      editor.gotoLine(targetLine + 1, targetColumn + 1, false);
      editor.selection.selectLine();
    }
  } catch (error) {
    console.error('Error highlighting path:', error);
  }
}

// Collapse all nodes in the tree view
function collapseAllNodes() {
  const expanders = document.querySelectorAll('.json-tree-expander.expanded');
  expanders.forEach(expander => {
    const childContent = expander.nextElementSibling;
    childContent.style.display = 'none';
    expander.textContent = expander.textContent.includes('[') ? '▶ [...]' : '▶ {...}';
    expander.className = 'json-tree-expander collapsed';
  });
}

// Expand all nodes in the tree view
function expandAllNodes() {
  const expanders = document.querySelectorAll('.json-tree-expander.collapsed');
  expanders.forEach(expander => {
    const childContent = expander.nextElementSibling;
    childContent.style.display = 'block';
    expander.textContent = expander.textContent.includes('[') ? '▼ [' : '▼ {';
    expander.className = 'json-tree-expander expanded';
  });
}

// Toggle tree view visibility
function toggleTreeView() {
  const editorContainer = document.getElementById('editor-container');
  const treeContainer = document.getElementById('tree-container');
  const btnTreeView = document.getElementById('btnTreeView');
  
  isTreeViewVisible = !isTreeViewVisible;
  
  if (isTreeViewVisible) {
    treeContainer.classList.remove('hidden');
    btnTreeView.classList.add('btn-active');
    updateTreeView();
  } else {
    treeContainer.classList.add('hidden');
    btnTreeView.classList.remove('btn-active');
  }
}

// Update status bar message
function updateStatus(message, type = null) {
  const statusElement = document.getElementById('validation-status');
  if (statusElement) {
    statusElement.textContent = message;
    
    // Reset classes
    statusElement.classList.remove('status-error', 'status-warning', 'status-success');
    
    // Add class based on type
    if (type) {
      statusElement.classList.add(`status-${type}`);
    }
  }
}

// Update file info in status bar
function updateFileInfo(filePath) {
  const fileInfoElement = document.getElementById('file-info');
  if (filePath) {
    currentFilePath = filePath;
    fileInfoElement.textContent = `File: ${filePath.split('/').pop()}`;
  } else {
    currentFilePath = null;
    fileInfoElement.textContent = 'No file loaded';
  }
  
  // Update the unsaved changes indicator whenever file info is updated
  updateUnsavedIndicator();
}

// Add a new function to update the unsaved changes indicator
function updateUnsavedIndicator() {
  const fileInfoElement = document.getElementById('file-info');
  
  // Remove any existing indicator
  if (fileInfoElement.querySelector('.unsaved-indicator')) {
    fileInfoElement.querySelector('.unsaved-indicator').remove();
  }
  
  // Add indicator if there are unsaved changes
  if (hasUnsavedChanges) {
    const indicator = document.createElement('span');
    indicator.className = 'unsaved-indicator';
    indicator.textContent = ' •';
    indicator.title = 'Unsaved changes';
    fileInfoElement.appendChild(indicator);
  }
}

// New file
function newFile() {
  // Check for unsaved changes
  if (hasUnsavedChanges) {
    if (!confirm('You have unsaved changes. Are you sure you want to create a new file?')) {
      return;
    }
  }
  
  editor.setValue('{\n  \n}', -1);
  updateFileInfo(null);
  currentSchema = null;
  document.getElementById('schema-info').textContent = 'No schema loaded';
  hasUnsavedChanges = false;
  updateStatus('New file created', 'success');
}

// Save file
function saveFile() {
  if (currentFilePath) {
    // If we have a current file path, use it
    saveCurrentFile();
  } else {
    // Otherwise, prompt for a new file path
    saveFileAs();
  }
}

// Save current file
async function saveCurrentFile() {
  if (!currentFilePath) {
    return saveFileAs();
  }
  
  try {
    const content = editor.getValue();
    // Use the electronAPI to save the file to the current path
    const result = await window.electronAPI.saveFile(currentFilePath, content);
    if (result && result.success) {
      hasUnsavedChanges = false;
      updateStatus('File saved successfully', 'success');
    } else {
      throw new Error('Failed to save file');
    }
  } catch (err) {
    updateStatus('Error saving file: ' + err.message, 'error');
    // If there was an error, try saveFileAs as a fallback
    saveFileAs();
  }
}

// Save file as
async function saveFileAs() {
  try {
    const content = editor.getValue();
    const result = await window.electronAPI.saveFileAs(content);
    if (result && !result.canceled && result.filePath) {
      currentFilePath = result.filePath;
      updateFileInfo(result.filePath);
      hasUnsavedChanges = false;
      updateStatus('File saved successfully', 'success');
      
      // Update file explorer if visible
      if (isFileExplorerVisible && currentFolderPath) {
        // Check if saved in current folder
        if (result.filePath.startsWith(currentFolderPath)) {
          refreshFolderInSidebar();
        }
      }
    }
  } catch (err) {
    updateStatus('Error saving file: ' + err.message, 'error');
  }
}

// Import JSON from URL
function importFromUrl() {
  openModal('urlImportModal');
}

// Handle URL import
function handleUrlImport() {
  const url = document.getElementById('urlInput').value;
  if (!url) return;
  
  updateStatus('Importing from URL...', 'warning');
  
  window.api.importFromUrl(url)
    .then((content) => {
      try {
        // Validate and format the content
        const parsedJSON = JSON.parse(content);
        const formattedJSON = JSON.stringify(parsedJSON, null, 2);
        
        editor.setValue(formattedJSON, -1);
        updateStatus('JSON imported successfully', 'success');
        closeModal('urlImportModal');
      } catch (error) {
        updateStatus(`Invalid JSON received: ${error.message}`, 'error');
      }
    })
    .catch((error) => {
      updateStatus(`Import failed: ${error.message}`, 'error');
    });
}

// Import JSON from clipboard
function importFromClipboard(content) {
  try {
    // Validate and format the content
    const parsedJSON = JSON.parse(content);
    const formattedJSON = JSON.stringify(parsedJSON, null, 2);
    
    editor.setValue(formattedJSON, -1);
    updateStatus('JSON imported from clipboard', 'success');
  } catch (error) {
    updateStatus(`Invalid JSON in clipboard: ${error.message}`, 'error');
  }
}

// Export JSON to clipboard
function exportToClipboard() {
  if (!editor) return;
  
  try {
    const content = editor.getValue();
    JSON.parse(content); // Validate first
    
    window.api.exportToClipboard(content);
    updateStatus('JSON copied to clipboard', 'success');
  } catch (error) {
    updateStatus(`Error: ${error.message}`, 'error');
  }
}

// Show keyboard shortcuts modal
function showShortcuts() {
  openModal('shortcutsModal');
}

// Initialize resizable divider
function initResizableDivider() {
  const divider = document.getElementById('divider');
  const editorContainer = document.getElementById('editor-container');
  const treeContainer = document.getElementById('tree-container');
  
  if (!divider) return;
  
  let isResizing = false;
  let startX, startWidth;
  
  divider.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = editorContainer.getBoundingClientRect().width;
    
    divider.classList.add('active');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    
    // Prevent text selection during resize
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    
    const dx = e.clientX - startX;
    const newWidth = startWidth + dx;
    const containerWidth = editorContainer.parentNode.getBoundingClientRect().width;
    
    // Enforce min/max constraints
    const minWidth = 300;
    const maxWidth = containerWidth - 300;
    
    if (newWidth > minWidth && newWidth < maxWidth) {
      const editorPercentage = (newWidth / containerWidth) * 100;
      const treePercentage = 100 - editorPercentage;
      
      editorContainer.style.flex = `0 0 ${editorPercentage}%`;
      treeContainer.style.flex = `0 0 ${treePercentage}%`;
      
      // Resize the ACE editor to match the new container size
      if (editor) {
        editor.resize();
      }
    }
  });
  
  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      divider.classList.remove('active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      
      // Save the layout preference to localStorage
      const editorWidth = editorContainer.getBoundingClientRect().width;
      const containerWidth = editorContainer.parentNode.getBoundingClientRect().width;
      const editorPercentage = (editorWidth / containerWidth) * 100;
      localStorage.setItem('editorSizePercentage', editorPercentage.toString());
    }
  });
  
  // Restore saved layout if available
  const savedPercentage = localStorage.getItem('editorSizePercentage');
  if (savedPercentage) {
    const editorPercentage = parseFloat(savedPercentage);
    const treePercentage = 100 - editorPercentage;
    
    editorContainer.style.flex = `0 0 ${editorPercentage}%`;
    treeContainer.style.flex = `0 0 ${treePercentage}%`;
  }
}

// Initialize JSON comparison modal
function initCompareModal() {
  // Initialize JSON editors for comparison
  compareEditorA = ace.edit('jsonAEditor');
  compareEditorA.setTheme('ace/theme/textmate');
  compareEditorA.session.setMode('ace/mode/json');
  compareEditorA.setOptions({
    enableBasicAutocompletion: true,
    enableLiveAutocompletion: true,
    showPrintMargin: false,
    fontSize: '14px',
    tabSize: 2
  });
  compareEditorA.setValue('{\n  \n}', -1);

  compareEditorB = ace.edit('jsonBEditor');
  compareEditorB.setTheme('ace/theme/textmate');
  compareEditorB.session.setMode('ace/mode/json');
  compareEditorB.setOptions({
    enableBasicAutocompletion: true,
    enableLiveAutocompletion: true,
    showPrintMargin: false,
    fontSize: '14px',
    tabSize: 2
  });
  compareEditorB.setValue('{\n  \n}', -1);

  // Make compare results container scrollable
  const compareResults = document.getElementById('compareResults');
  if (compareResults) {
    compareResults.style.maxHeight = '400px';
    compareResults.style.overflowY = 'auto';
    compareResults.style.overflowX = 'hidden';
  }

  // Set up event handlers for comparison buttons
  document.getElementById('btnUseCurrentJsonA').addEventListener('click', () => {
    compareEditorA.setValue(editor.getValue(), -1);
  });

  document.getElementById('btnUseCurrentJsonB').addEventListener('click', () => {
    compareEditorB.setValue(editor.getValue(), -1);
  });

  document.getElementById('btnPasteJsonA').addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      compareEditorA.setValue(text, -1);
    } catch (err) {
      updateStatus('Failed to read clipboard: ' + err.message, 'error');
    }
  });

  document.getElementById('btnPasteJsonB').addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      compareEditorB.setValue(text, -1);
    } catch (err) {
      updateStatus('Failed to read clipboard: ' + err.message, 'error');
    }
  });

  document.getElementById('btnLoadJsonA').addEventListener('click', () => {
    window.electronAPI.openFile().then(result => {
      if (result && !result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        window.electronAPI.readFile(filePath).then(content => {
          compareEditorA.setValue(content, -1);
        }).catch(err => {
          updateStatus('Error reading file: ' + err.message, 'error');
        });
      }
    }).catch(err => {
      updateStatus('Error opening file: ' + err.message, 'error');
    });
  });

  document.getElementById('btnLoadJsonB').addEventListener('click', () => {
    window.electronAPI.openFile().then(result => {
      if (result && !result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        window.electronAPI.readFile(filePath).then(content => {
          compareEditorB.setValue(content, -1);
        }).catch(err => {
          updateStatus('Error reading file: ' + err.message, 'error');
        });
      }
    }).catch(err => {
      updateStatus('Error opening file: ' + err.message, 'error');
    });
  });

  document.getElementById('btnRunCompare').addEventListener('click', compareJsons);
}

// Compare two JSON objects
function compareJsons() {
  const resultsContainer = document.getElementById('compareResults');
  resultsContainer.innerHTML = '';

  try {
    // Parse JSON content from both editors
    const jsonAContent = compareEditorA.getValue();
    const jsonBContent = compareEditorB.getValue();
    
    let jsonA, jsonB;
    
    try {
      jsonA = JSON.parse(jsonAContent);
    } catch (err) {
      resultsContainer.innerHTML = '<div class="error-message">Error parsing JSON A: ' + err.message + '</div>';
      return;
    }
    
    try {
      jsonB = JSON.parse(jsonBContent);
    } catch (err) {
      resultsContainer.innerHTML = '<div class="error-message">Error parsing JSON B: ' + err.message + '</div>';
      return;
    }
    
    // Perform the comparison
    const diffs = findDifferences(jsonA, jsonB);
    
    if (diffs.length === 0) {
      resultsContainer.innerHTML = '<div class="success-message">No differences found. The JSON objects are identical!</div>';
      return;
    }
    
    // Display the differences
    diffs.forEach(diff => {
      const diffItem = document.createElement('div');
      diffItem.className = 'diff-item';
      
      const diffHeader = document.createElement('div');
      diffHeader.className = 'diff-header';
      
      const diffType = document.createElement('span');
      diffType.className = `diff-type diff-type-${diff.type}`;
      diffType.textContent = diff.type.toUpperCase();
      
      const diffPath = document.createElement('span');
      diffPath.className = 'diff-path';
      diffPath.textContent = diff.path;
      
      diffHeader.appendChild(diffType);
      diffHeader.appendChild(diffPath);
      diffItem.appendChild(diffHeader);
      
      const diffContent = document.createElement('div');
      diffContent.className = 'diff-content';
      
      if (diff.type === 'changed') {
        const oldValue = document.createElement('div');
        oldValue.className = 'diff-old-value';
        oldValue.textContent = 'A: ' + JSON.stringify(diff.oldValue, null, 2);
        
        const newValue = document.createElement('div');
        newValue.className = 'diff-new-value';
        newValue.textContent = 'B: ' + JSON.stringify(diff.newValue, null, 2);
        
        diffContent.appendChild(oldValue);
        diffContent.appendChild(newValue);
      } else if (diff.type === 'added') {
        const newValue = document.createElement('div');
        newValue.className = 'diff-new-value';
        newValue.textContent = JSON.stringify(diff.value, null, 2);
        diffContent.appendChild(newValue);
      } else if (diff.type === 'removed') {
        const oldValue = document.createElement('div');
        oldValue.className = 'diff-old-value';
        oldValue.textContent = JSON.stringify(diff.value, null, 2);
        diffContent.appendChild(oldValue);
      }
      
      diffItem.appendChild(diffContent);
      resultsContainer.appendChild(diffItem);
    });
  } catch (error) {
    resultsContainer.innerHTML = '<div class="error-message">Error comparing JSON: ' + error.message + '</div>';
  }
}

// Find differences between two JSON objects with sorted keys
function findDifferences(objA, objB, path = '', diffs = []) {
  // If both objects are primitive values
  if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) {
    if (objA !== objB) {
      diffs.push({
        type: 'changed',
        path: path || '$',
        oldValue: objA,
        newValue: objB
      });
    }
    return diffs;
  }
  
  // Sort keys for consistent comparison regardless of order
  const keysA = Object.keys(objA).sort();
  const keysB = Object.keys(objB).sort();
  
  // Find keys in A that are not in B (removed keys)
  keysA.forEach(key => {
    if (!keysB.includes(key)) {
      diffs.push({
        type: 'removed',
        path: path ? `${path}.${key}` : key,
        value: objA[key]
      });
    }
  });
  
  // Find keys in B that are not in A (added keys)
  keysB.forEach(key => {
    if (!keysA.includes(key)) {
      diffs.push({
        type: 'added',
        path: path ? `${path}.${key}` : key,
        value: objB[key]
      });
    }
  });
  
  // Compare values for keys that exist in both objects
  keysA.filter(key => keysB.includes(key)).forEach(key => {
    const newPath = path ? `${path}.${key}` : key;
    
    if (Array.isArray(objA[key]) && Array.isArray(objB[key])) {
      // Handle arrays
      if (JSON.stringify(objA[key]) !== JSON.stringify(objB[key])) {
        // For arrays, compare them directly since order matters
        diffs.push({
          type: 'changed',
          path: newPath,
          oldValue: objA[key],
          newValue: objB[key]
        });
      }
    } else if (
      typeof objA[key] === 'object' && objA[key] !== null &&
      typeof objB[key] === 'object' && objB[key] !== null
    ) {
      // Recursively compare nested objects
      findDifferences(objA[key], objB[key], newPath, diffs);
    } else if (objA[key] !== objB[key]) {
      // Compare primitive values
      diffs.push({
        type: 'changed',
        path: newPath,
        oldValue: objA[key],
        newValue: objB[key]
      });
    }
  });
  
  return diffs;
}

// Show JSON Compare dialog
function showCompare() {
  openModal('compareModal');
  
  // Resize the compare editors when the modal is opened
  if (compareEditorA && compareEditorB) {
    compareEditorA.resize();
    compareEditorB.resize();
  }
  
  // Set up resize observer for the modal content
  const modalContent = document.querySelector('#compareModal .modal-content');
  if (modalContent && !modalContent._resizeObserverAttached) {
    const resizeObserver = new ResizeObserver(() => {
      if (compareEditorA && compareEditorB) {
        compareEditorA.resize();
        compareEditorB.resize();
      }
    });
    resizeObserver.observe(modalContent);
    modalContent._resizeObserverAttached = true;
  }
}

// Setup keyboard shortcuts
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Check if Cmd key (Mac) or Ctrl key (Windows/Linux) is pressed
    const isCmdOrCtrl = e.metaKey || e.ctrlKey;
    
    if (isCmdOrCtrl) {
      switch (e.key) {
        case 'n':
          e.preventDefault();
          newFile();
          break;
        case 'o':
          e.preventDefault();
          // Use Cmd+O for Open File only
          openSingleFile();
          break;
        case 's':
          e.preventDefault();
          if (e.shiftKey) {
            // Shift+Cmd+S for Save As
            saveFileAs();
          } else {
            // Cmd+S for Save
            saveFile();
          }
          break;
        case 'e':
          if (e.shiftKey) {
            e.preventDefault();
            exportToClipboard();
          } else {
            // Cmd+E to toggle file explorer
            e.preventDefault();
            toggleFileExplorer();
          }
          break;
        case 'f':
          e.preventDefault();
          toggleSearch();
          break;
        case 't':
          e.preventDefault();
          toggleTreeView();
          break;
        case 'd':
          if (e.shiftKey) {
            e.preventDefault();
            showCompare();
          }
          break;
        case ']':
          e.preventDefault();
          expandAllNodes();
          break;
        case '[':
          e.preventDefault();
          collapseAllNodes();
          break;
        case 'i':
          e.preventDefault();
          if (e.shiftKey) {
            // Import from clipboard
            navigator.clipboard.readText().then(text => {
              importFromClipboard(text);
            }).catch(err => {
              updateStatus('Failed to read clipboard: ' + err.message, 'error');
            });
          } else {
            importFromUrl();
          }
          break;
      }
      
      // Handle special cases with different characters
      if (e.key === 'F' && e.shiftKey) {
        e.preventDefault();
        formatJSON();
      } else if (e.key === 'C' && e.shiftKey) {
        e.preventDefault();
        compressJSON();
      } else if (e.key === 'V' && e.shiftKey) {
        e.preventDefault();
        validateJSON(true);
      } else if (e.key === 'K' && e.shiftKey) {
        e.preventDefault();
        showShortcuts();
      }
    }
  });
}

// Toggle file explorer sidebar
function toggleFileExplorer() {
  const fileExplorer = document.getElementById('file-explorer');
  
  isFileExplorerVisible = !isFileExplorerVisible;
  
  if (isFileExplorerVisible) {
    fileExplorer.classList.remove('hidden');
    if (currentFolderPath) {
      loadJsonFilesInSidebar(currentFolderPath);
    }
  } else {
    fileExplorer.classList.add('hidden');
  }
}

// Choose a folder for sidebar
async function chooseFolderForSidebar() {
  try {
    const result = await window.electronAPI.openFolder();
    if (result && !result.canceled && result.filePaths.length > 0) {
      const folderPath = result.filePaths[0];
      currentFolderPath = folderPath;
      document.getElementById('sidebarFolderPath').textContent = `${folderPath}`;
      
      // Load JSON files from the folder into sidebar
      loadJsonFilesInSidebar(folderPath);
    }
  } catch (err) {
    updateStatus('Error selecting folder: ' + err.message, 'error');
  }
}

// Load JSON files in sidebar
async function loadJsonFilesInSidebar(folderPath) {
  try {
    const jsonFiles = await window.electronAPI.readFolder(folderPath);
    const fileListContainer = document.getElementById('folderFileList');
    
    if (jsonFiles.length === 0) {
      fileListContainer.innerHTML = '<div class="empty-folder-message">No JSON files found in this folder</div>';
      return;
    }
    
    fileListContainer.innerHTML = '';
    
    // Create list items for each JSON file
    jsonFiles.forEach(file => {
      const fileItem = document.createElement('div');
      fileItem.className = 'file-list-item';
      if (currentFilePath === file.path) {
        fileItem.classList.add('active');
        currentlyOpenedFile = fileItem;
      }
      fileItem.innerHTML = `<i class="fas fa-file-code"></i> ${file.name}`;
      fileItem.dataset.path = file.path;
      fileItem.addEventListener('click', () => openJsonFileFromSidebar(file.path, fileItem));
      fileListContainer.appendChild(fileItem);
    });
    
  } catch (err) {
    updateStatus('Error loading files from folder: ' + err.message, 'error');
  }
}

// Open a JSON file from the sidebar
async function openJsonFileFromSidebar(filePath, fileItem) {
  // Check for unsaved changes
  if (hasUnsavedChanges) {
    if (!confirm('You have unsaved changes. Are you sure you want to open another file?')) {
      return;
    }
  }
  
  try {
    const content = await window.electronAPI.readFile(filePath);
    editor.setValue(content, -1);
    currentFilePath = filePath;
    updateFileInfo(filePath);
    hasUnsavedChanges = false;
    updateStatus('File loaded successfully', 'success');
    
    // Update active file in sidebar
    if (currentlyOpenedFile) {
      currentlyOpenedFile.classList.remove('active');
    }
    fileItem.classList.add('active');
    currentlyOpenedFile = fileItem;
  } catch (err) {
    updateStatus('Error opening file: ' + err.message, 'error');
  }
}

// Refresh current folder in sidebar
async function refreshFolderInSidebar() {
  if (currentFolderPath) {
    await loadJsonFilesInSidebar(currentFolderPath);
    updateStatus('Folder refreshed', 'success');
  } else {
    updateStatus('No folder selected', 'warning');
  }
}

// Open a single file dialog
async function openSingleFile() {
  // Check for unsaved changes
  if (hasUnsavedChanges) {
    if (!confirm('You have unsaved changes. Are you sure you want to open another file?')) {
      return;
    }
  }
  
  try {
    const result = await window.electronAPI.openFile();
    if (result && !result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      const content = await window.electronAPI.readFile(filePath);
      editor.setValue(content, -1);
      currentFilePath = filePath;
      updateFileInfo(filePath);
      hasUnsavedChanges = false;
      
      // Update file explorer if visible
      if (isFileExplorerVisible && currentFolderPath) {
        // Check if opened file is in current folder
        if (filePath.startsWith(currentFolderPath)) {
          refreshFolderInSidebar();
        }
      }
    }
  } catch (err) {
    updateStatus('Error opening file: ' + err.message, 'error');
  }
}

// Add this function at an appropriate location, e.g., just before or after setupKeyboardShortcuts
function setupBeforeUnloadWarning() {
  window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges) {
      // Standard way to show a confirmation dialog before closing
      e.preventDefault();
      e.returnValue = '';
      return '';
    }
  });
}

// Gemini API Functions
async function callGeminiAPI(prompt, jsonContent) {
  if (!geminiApiKey) {
    throw new Error('Gemini API key is required. Please add your API key in Settings.');
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;
    const fullPrompt = jsonContent ? `${prompt}\n\nJSON Content:\n\`\`\`json\n${jsonContent}\n\`\`\`` : prompt;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: fullPrompt }]
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API Error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.candidates[0]?.content?.parts[0]?.text || 'No response from the AI.';
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
}

// Settings functions
function showSettings() {
  document.getElementById('geminiApiKey').value = geminiApiKey || '';
  openModal('settingsModal');
}

function saveSettings() {
  const apiKey = document.getElementById('geminiApiKey').value.trim();
  const theme = document.getElementById('editorTheme').value;
  const fontSize = document.getElementById('editorFontSize').value;
  
  // Save API key
  geminiApiKey = apiKey;
  localStorage.setItem('geminiApiKey', apiKey);
  
  // Apply editor settings
  editor.setTheme(theme);
  editor.setOptions({ fontSize: fontSize });
  localStorage.setItem('editorTheme', theme);
  localStorage.setItem('editorFontSize', fontSize);
  
  // Apply settings to compare editors as well
  if (compareEditorA && compareEditorB) {
    compareEditorA.setTheme(theme);
    compareEditorA.setOptions({ fontSize: fontSize });
    compareEditorB.setTheme(theme);
    compareEditorB.setOptions({ fontSize: fontSize });
  }
  
  closeModal('settingsModal');
  updateStatus('Settings saved successfully', 'success');
}

function toggleApiKeyVisibility() {
  const apiKeyInput = document.getElementById('geminiApiKey');
  const toggleBtn = document.getElementById('btnToggleApiKey');
  
  if (apiKeyInput.type === 'password') {
    apiKeyInput.type = 'text';
    toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
  } else {
    apiKeyInput.type = 'password';
    toggleBtn.innerHTML = '<i class="fas fa-eye"></i>';
  }
}

// AI Menu functions
function showAiToolsMenu(event) {
  const menu = document.getElementById('aiToolsMenu');
  const rect = event.currentTarget.getBoundingClientRect();
  
  menu.style.top = `${rect.bottom + 5}px`;
  menu.style.left = `${rect.left}px`;
  menu.classList.remove('hidden');
  
  // Close the menu when clicking outside
  const closeMenu = (e) => {
    if (!menu.contains(e.target) && e.target !== event.currentTarget) {
      menu.classList.add('hidden');
      document.removeEventListener('mousedown', closeMenu);
    }
  };
  
  document.addEventListener('mousedown', closeMenu);
}

// AI Explain functions
function showExplainJsonModal() {
  // Get editor content
  const jsonContent = editor.getValue();
  document.getElementById('explainJsonPath').textContent = 'Full JSON Document';
  
  // Show modal
  openModal('aiExplainModal');
  
  // Start explanation
  explainJson(jsonContent, 'full');
}

async function explainJson(jsonContent, pathType) {
  try {
    // Validate JSON first
    JSON.parse(jsonContent);
    
    // Show loader
    document.querySelector('#aiExplainModal .ai-loader').classList.remove('hidden');
    document.getElementById('aiExplanationResult').innerHTML = '';
    
    // Create the prompt based on path type
    let prompt;
    if (pathType === 'full') {
      prompt = 'Please explain this JSON document in detail, including the structure, purpose of key fields, data types, and any patterns you notice. If this appears to be a specific type of data structure or API response, please mention that.';
    } else {
      prompt = `Please explain the JSON at path "${selectedJsonPath}". Describe what this field likely represents, its data type, possible values, and how it might be used in the application. If this is a common data pattern, please explain.`;
    }
    
    // Call Gemini API
    const explanation = await callGeminiAPI(prompt, jsonContent);
    
    // Display the result
    document.getElementById('aiExplanationResult').innerHTML = marked.parse(explanation);
    
  } catch (error) {
    document.getElementById('aiExplanationResult').innerHTML = `
      <div class="error-message">
        <strong>Error:</strong> ${error.message}
      </div>
    `;
  } finally {
    // Hide loader
    document.querySelector('#aiExplainModal .ai-loader').classList.add('hidden');
  }
}

// AI Fix JSON functions
function showFixJsonModal() {
  // Get editor content
  const jsonContent = editor.getValue();
  
  // Show modal
  openModal('fixJsonModal');
  
  // Start fixing
  fixJson(jsonContent);
}

async function fixJson(jsonContent) {
  try {
    // Try to parse JSON first to see if it's already valid
    try {
      JSON.parse(jsonContent);
      // If we get here, JSON is valid, so just format it
      document.getElementById('jsonIssues').textContent = 'No issues found. Your JSON is valid.';
      const formattedJson = JSON.stringify(JSON.parse(jsonContent), null, 2);
      document.getElementById('fixedJson').innerHTML = `<pre>${escapeHtml(formattedJson)}</pre>`;
      document.getElementById('btnApplyFix').disabled = true;
      return;
    } catch (parseError) {
      // JSON is invalid, continue with fixing
    }
    
    // Show loader
    document.querySelector('#fixJsonModal .ai-loader').classList.remove('hidden');
    document.getElementById('jsonIssues').innerHTML = '';
    document.getElementById('fixedJson').innerHTML = '';
    document.getElementById('btnApplyFix').disabled = true;
    
    // Create the prompt
    const prompt = `
    I have some invalid JSON that needs to be fixed. Please analyze the JSON, identify the issues, and return a corrected version.
    In your response, first list the specific issues you found with line numbers if possible.
    Then, provide the fixed JSON. Make sure to preserve the original structure and data as much as possible.
    Format your response with "ISSUES:" followed by the list of issues, then "FIXED_JSON:" followed by the corrected JSON.
    `;
    
    // Call Gemini API
    const result = await callGeminiAPI(prompt, jsonContent);
    
    // Parse the response to extract issues and fixed JSON
    const issuesMatch = result.match(/ISSUES:([\s\S]*?)(?:FIXED_JSON:|$)/i);
    const fixedJsonMatch = result.match(/FIXED_JSON:([\s\S]*)/i);
    
    let issues = issuesMatch ? issuesMatch[1].trim() : 'Could not identify specific issues.';
    let fixedJson = fixedJsonMatch ? fixedJsonMatch[1].trim() : '';
    
    // Try to extract just the JSON part from the fixed JSON
    try {
      const jsonStart = fixedJson.indexOf('{');
      const jsonEnd = fixedJson.lastIndexOf('}') + 1;
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        fixedJson = fixedJson.substring(jsonStart, jsonEnd);
      }
    } catch (e) {
      console.error('Error extracting JSON:', e);
    }
    
    // Display the issues
    document.getElementById('jsonIssues').innerHTML = marked.parse(issues);
    
    // Format and display the fixed JSON
    try {
      const parsedJson = JSON.parse(fixedJson);
      const formattedJson = JSON.stringify(parsedJson, null, 2);
      document.getElementById('fixedJson').innerHTML = `<pre>${escapeHtml(formattedJson)}</pre>`;
      document.getElementById('btnApplyFix').disabled = false;
    } catch (e) {
      document.getElementById('fixedJson').innerHTML = `
        <div class="error-message">
          <strong>Error:</strong> Could not parse the fixed JSON. The AI might not have generated valid JSON.
        </div>
        <pre>${escapeHtml(fixedJson)}</pre>
      `;
      document.getElementById('btnApplyFix').disabled = true;
    }
    
  } catch (error) {
    document.getElementById('jsonIssues').innerHTML = `
      <div class="error-message">
        <strong>Error:</strong> ${error.message}
      </div>
    `;
    document.getElementById('fixedJson').innerHTML = '';
    document.getElementById('btnApplyFix').disabled = true;
  } finally {
    // Hide loader
    document.querySelector('#fixJsonModal .ai-loader').classList.add('hidden');
  }
}

function applyFixedJson() {
  try {
    const fixedJsonElement = document.getElementById('fixedJson');
    const preElement = fixedJsonElement.querySelector('pre');
    if (preElement) {
      const fixedJson = preElement.textContent;
      editor.setValue(fixedJson, -1);
      closeModal('fixJsonModal');
      updateStatus('Fixed JSON applied successfully', 'success');
    }
  } catch (error) {
    updateStatus(`Error applying fix: ${error.message}`, 'error');
  }
}

// Smart Search functions
function showSmartSearchModal() {
  openModal('smartSearchModal');
  document.getElementById('smartSearchQuery').focus();
}

async function runSmartSearch() {
  const query = document.getElementById('smartSearchQuery').value.trim();
  if (!query) return;
  
  const jsonContent = editor.getValue();
  
  try {
    // Validate JSON first
    JSON.parse(jsonContent);
    
    // Show loader
    document.querySelector('#smartSearchModal .ai-loader').classList.remove('hidden');
    document.getElementById('smartSearchResults').innerHTML = '';
    
    // Create the prompt
    const prompt = `
    I have a JSON document and I want to search it using natural language. 
    My search query is: "${query}"
    
    Please analyze the JSON and find the relevant parts that match this query. 
    For each match, provide:
    1. The JSON path to the matching element(s)
    2. The matching value(s)
    3. A brief explanation of why this is relevant to my query
    
    Format the response in clear sections with Markdown formatting for better readability.
    If no matches are found, please suggest alternative search terms.
    `;
    
    // Call Gemini API
    const result = await callGeminiAPI(prompt, jsonContent);
    
    // Display the result
    document.getElementById('smartSearchResults').innerHTML = marked.parse(result);
    
  } catch (error) {
    document.getElementById('smartSearchResults').innerHTML = `
      <div class="error-message">
        <strong>Error:</strong> ${error.message}
      </div>
    `;
  } finally {
    // Hide loader
    document.querySelector('#smartSearchModal .ai-loader').classList.add('hidden');
  }
}

// AI Schema Generator
function showAiSchemaGenerator() {
  // Just use the existing schema generator with an improved version
  generateAiEnhancedSchema();
}

async function generateAiEnhancedSchema() {
  if (!editor) return;
  
  try {
    // First, open the modal immediately with a loading message
    document.getElementById('aiSchemaResults').textContent = 'Generating AI-enhanced schema... Please wait.';
    openModal('aiSchemaModal');
    
    const content = editor.getValue();
    const data = JSON.parse(content);
    
    // Create a basic schema
    const basicSchema = {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: Array.isArray(data) ? 'array' : 'object'
    };
    
    // For objects, generate properties schema
    if (typeof data === 'object' && !Array.isArray(data)) {
      basicSchema.properties = {};
      basicSchema.required = [];
      
      Object.keys(data).forEach(key => {
        basicSchema.required.push(key);
        basicSchema.properties[key] = getTypeSchema(data[key]);
      });
    }
    
    // For arrays, generate items schema if array is not empty
    if (Array.isArray(data) && data.length > 0) {
      // Use the first item as a reference
      basicSchema.items = getTypeSchema(data[0]);
    }
    
    // Display the basic schema while we wait for the enhanced one
    document.getElementById('aiSchemaResults').textContent = 'Basic schema generated. Enhancing with AI...\n\n' + 
      JSON.stringify(basicSchema, null, 2);
    
    updateStatus('Generating enhanced schema...', 'warning');
    
    // Call Gemini API to enhance the schema
    const prompt = `
    I have a JSON schema that was automatically generated. Please enhance it by:
    1. Adding proper titles and descriptions for fields
    2. Adding appropriate format validators for fields like email, date, url, etc.
    3. Adding pattern validators for strings where appropriate
    4. Suggesting reasonable min/max values for numbers
    5. Improving enum values for fields that have a limited set of possible values
    6. Adding any other improvements that would make this schema more useful and descriptive
    
    The basic schema is:
    \`\`\`json
    ${JSON.stringify(basicSchema, null, 2)}
    \`\`\`
    
    Please return only the enhanced JSON schema as valid JSON, with no additional text or explanation.
    `;
    
    const enhancedSchemaText = await callGeminiAPI(prompt, content);
    
    // Extract just the JSON part from the response
    const jsonStart = enhancedSchemaText.indexOf('{');
    const jsonEnd = enhancedSchemaText.lastIndexOf('}') + 1;
    let enhancedSchemaJson;
    
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      enhancedSchemaJson = enhancedSchemaText.substring(jsonStart, jsonEnd);
    } else {
      // Fallback to the entire response
      enhancedSchemaJson = enhancedSchemaText;
    }
    
    // Parse the enhanced schema
    try {
      currentSchema = JSON.parse(enhancedSchemaJson);
      updateStatus('Schema generated successfully', 'success');
      document.getElementById('schema-info').textContent = 'Schema: AI Enhanced';
      
      // Show the schema in the AI Schema Generator modal
      document.getElementById('aiSchemaResults').textContent = JSON.stringify(currentSchema, null, 2);
    } catch (error) {
      // If parsing fails, fall back to the basic schema
      currentSchema = basicSchema;
      updateStatus('Enhanced schema parsing failed, using basic schema', 'warning');
      document.getElementById('schema-info').textContent = 'Schema: Basic (AI enhancement failed)';
      
      // Show the basic schema with error message
      document.getElementById('aiSchemaResults').textContent = 
        'Error processing AI-enhanced schema. Using basic schema instead:\n\n' + 
        JSON.stringify(basicSchema, null, 2);
    }
    
  } catch (error) {
    updateStatus(`Error generating schema: ${error.message}`, 'error');
    
    // Show error in the modal
    if (document.getElementById('aiSchemaModal').style.display === 'block') {
      document.getElementById('aiSchemaResults').textContent = 
        `Error generating schema: ${error.message}\n\nPlease check that your JSON is valid and try again.`;
    }
  }
}

// Mock Data Generator
function showMockDataModal() {
  openModal('mockDataModal');
  document.getElementById('mockDataPrompt').focus();
}

async function generateMockData() {
  const prompt = document.getElementById('mockDataPrompt').value.trim();
  if (!prompt) return;
  
  const isFormatted = document.getElementById('mockDataFormatted').checked;
  
  try {
    // Show loader
    document.querySelector('#mockDataModal .ai-loader').classList.remove('hidden');
    document.getElementById('mockDataResults').innerHTML = '<div class="mock-data-placeholder">Generating...</div>';
    document.getElementById('btnUseMockData').disabled = true;
    
    // Create the prompt
    const aiPrompt = `
    Generate mock JSON data based on the following description: "${prompt}"
    
    Please create realistic, detailed mock data that matches the description.
    The response should be ONLY valid JSON with no additional text or explanation.
    ${isFormatted ? 'Format the JSON with proper indentation for readability.' : 'Compress the JSON without unnecessary whitespace.'}
    `;
    
    // Call Gemini API
    const result = await callGeminiAPI(aiPrompt);
    
    // Extract just the JSON part from the response
    const jsonStart = result.indexOf('{');
    const jsonEnd = result.lastIndexOf('}') + 1;
    let mockData;
    
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      mockData = result.substring(jsonStart, jsonEnd);
    } else {
      // Check for array format
      const arrayStart = result.indexOf('[');
      const arrayEnd = result.lastIndexOf(']') + 1;
      if (arrayStart >= 0 && arrayEnd > arrayStart) {
        mockData = result.substring(arrayStart, arrayEnd);
      } else {
        // Fallback to the entire response
        mockData = result;
      }
    }
    
    // Try to parse and display the JSON
    try {
      const parsedJson = JSON.parse(mockData);
      const formattedJson = isFormatted ? JSON.stringify(parsedJson, null, 2) : JSON.stringify(parsedJson);
      document.getElementById('mockDataResults').innerHTML = `<pre>${escapeHtml(formattedJson)}</pre>`;
      document.getElementById('btnUseMockData').disabled = false;
    } catch (e) {
      document.getElementById('mockDataResults').innerHTML = `
        <div class="error-message">
          <strong>Error:</strong> Could not parse the generated JSON. The AI might not have generated valid JSON.
        </div>
        <pre>${escapeHtml(mockData)}</pre>
      `;
      document.getElementById('btnUseMockData').disabled = true;
    }
    
  } catch (error) {
    document.getElementById('mockDataResults').innerHTML = `
      <div class="error-message">
        <strong>Error:</strong> ${error.message}
      </div>
    `;
    document.getElementById('btnUseMockData').disabled = true;
  } finally {
    // Hide loader
    document.querySelector('#mockDataModal .ai-loader').classList.add('hidden');
  }
}

function useMockData() {
  try {
    const mockDataElement = document.getElementById('mockDataResults');
    const preElement = mockDataElement.querySelector('pre');
    if (preElement) {
      const mockData = preElement.textContent;
      editor.setValue(mockData, -1);
      closeModal('mockDataModal');
      updateStatus('Mock data applied successfully', 'success');
    }
  } catch (error) {
    updateStatus(`Error applying mock data: ${error.message}`, 'error');
  }
}

// Context menu for JSON tree
function setupJsonTreeContextMenu() {
  const treeContainer = document.getElementById('json-tree');
  const contextMenu = document.getElementById('jsonKeyContextMenu');
  
  treeContainer.addEventListener('contextmenu', (e) => {
    // Find the closest node element
    const node = e.target.closest('.json-tree-node');
    if (!node) return;
    
    // Get the path from the node
    selectedJsonPath = node.dataset.path;
    if (!selectedJsonPath) return;
    
    // Get the JSON at this path
    try {
      const json = editor.getValue();
      const parsedJson = JSON.parse(json);
      
      // Navigate to the selected path
      let pathParts = selectedJsonPath.split('.');
      if (pathParts[0] === '$') pathParts = pathParts.slice(1);
      
      let currentObj = parsedJson;
      for (const part of pathParts) {
        if (part === '$') continue;
        
        // Handle array indices in path
        const arrayMatch = part.match(/\[(\d+)\]/);
        if (arrayMatch) {
          currentObj = currentObj[parseInt(arrayMatch[1])];
        } else {
          currentObj = currentObj[part];
        }
        
        if (currentObj === undefined) return;
      }
      
      // Store the JSON for this key
      currentJsonKeyContext = JSON.stringify(currentObj, null, 2);
      
      // Position and show the context menu
      e.preventDefault();
      contextMenu.style.top = `${e.pageY}px`;
      contextMenu.style.left = `${e.pageX}px`;
      contextMenu.classList.remove('hidden');
      
      // Close the menu when clicking outside
      const closeContextMenu = (e) => {
        if (!contextMenu.contains(e.target)) {
          contextMenu.classList.add('hidden');
          document.removeEventListener('mousedown', closeContextMenu);
        }
      };
      
      document.addEventListener('mousedown', closeContextMenu);
    } catch (error) {
      console.error('Error setting up context menu:', error);
    }
  });
}

function explainJsonKey() {
  if (!selectedJsonPath || !currentJsonKeyContext) return;
  
  document.getElementById('explainJsonPath').textContent = selectedJsonPath;
  openModal('aiExplainModal');
  explainJson(currentJsonKeyContext, 'key');
}

// Helper functions
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Initialize marked library for Markdown parsing
const marked = {
  parse: function(text) {
    if (!text) return '';
    
    // Process the text in chunks to handle block elements properly
    const lines = text.split('\n');
    let inCodeBlock = false;
    let codeContent = '';
    let result = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Handle code blocks
      if (line.trim().startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeContent = '';
        } else {
          result += `<pre><code>${escapeHtml(codeContent)}</code></pre>`;
          inCodeBlock = false;
        }
        continue;
      }
      
      if (inCodeBlock) {
        codeContent += line + '\n';
        continue;
      }
      
      // Handle horizontal rules
      if (line.trim().match(/^---+$/)) {
        result += '<hr class="md-hr">';
        continue;
      }
      
      // Handle headers
      let processedLine = line
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^# (.*$)/gm, '<h1>$1</h1>');
      
      // Handle inline elements
      processedLine = processedLine
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Inline code
        .replace(/`([^`]+)`/g, '<code>$1</code>');
      
      // Handle lists
      if (processedLine.match(/^\s*\d+\.\s+(.*)$/)) {
        processedLine = processedLine.replace(/^\s*\d+\.\s+(.*$)/, '<li>$1</li>');
        // Wrap in <ol> if not already in a list
        if (!result.endsWith('</li>')) {
          processedLine = '<ol>' + processedLine;
        }
        if (i === lines.length - 1 || !lines[i + 1].match(/^\s*\d+\.\s+(.*)$/)) {
          processedLine += '</ol>';
        }
      } else if (processedLine.match(/^\s*[\-*]\s+(.*$)/)) {
        processedLine = processedLine.replace(/^\s*[\-*]\s+(.*$)/, '<li>$1</li>');
        // Wrap in <ul> if not already in a list
        if (!result.endsWith('</li>')) {
          processedLine = '<ul>' + processedLine;
        }
        if (i === lines.length - 1 || !lines[i + 1].match(/^\s*[\-*]\s+(.*$)/)) {
          processedLine += '</ul>';
        }
      } 
      // Handle paragraphs but not for lines that already have HTML tags
      else if (processedLine.trim() !== '' && !processedLine.trim().startsWith('<')) {
        processedLine = '<p>' + processedLine + '</p>';
      }
      
      result += processedLine;
    }
    
    // Clean up any unclosed code blocks
    if (inCodeBlock) {
      result += `<pre><code>${escapeHtml(codeContent)}</code></pre>`;
    }
    
    // Fix search result formatting
    result = result
      // Handle custom search result format
      .replace(/<strong>JSON Path:<\/strong>/g, '<div class="search-result-label">JSON Path:</div><div class="search-result-value">')
      .replace(/<strong>Matching Value:<\/strong>/g, '</div><div class="search-result-label">Matching Value:</div><div class="search-result-value">')
      .replace(/<strong>Explanation:<\/strong>/g, '</div><div class="search-result-label">Explanation:</div><div class="search-result-value">')
      .replace(/---<\/p>/g, '</div><hr class="md-hr">');
    
    // Ensure all search-result-value divs are closed
    if (result.includes('<div class="search-result-value">') && 
        !result.endsWith('</div>')) {
      result += '</div>';
    }
    
    return result;
  }
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing application...');
  
  // Initialize editor
  initEditor();
  
  // Initialize comparison modal
  initCompareModal();
  
  // Initialize schema validation modal
  initSchemaValidationModal();
  
  // Set up resizable divider
  initResizableDivider();
  
  // Add CSS styles for schema validation modal
  addSchemaValidationStyles();
  
  // Set up keyboard shortcuts
  setupKeyboardShortcuts();
  
  // Set up unsaved changes warning
  setupBeforeUnloadWarning();
  
  // Initialize event listeners for buttons
  document.getElementById('btnNew').addEventListener('click', newFile);
  document.getElementById('btnOpen').addEventListener('click', () => {
    // Show file/folder option dialog
    const openOptions = document.createElement('div');
    openOptions.className = 'open-options-popup';
    openOptions.innerHTML = `
      <button id="btnOpenFile" class="btn">
        <i class="fas fa-file"></i> Open File
      </button>
      <button id="btnExploreFiles" class="btn">
        <i class="fas fa-list"></i> File Explorer
      </button>
    `;
    
    document.body.appendChild(openOptions);
    
    // Position the popup near the Open button
    const openBtn = document.getElementById('btnOpen');
    const rect = openBtn.getBoundingClientRect();
    openOptions.style.top = `${rect.bottom + 5}px`;
    openOptions.style.left = `${rect.left}px`;
    
    // Add event listeners
    document.getElementById('btnOpenFile').addEventListener('click', () => {
      document.body.removeChild(openOptions);
      openSingleFile();
    });
    
    document.getElementById('btnExploreFiles').addEventListener('click', () => {
      document.body.removeChild(openOptions);
      toggleFileExplorer();
    });
    
    // Close the popup when clicking outside
    const closePopup = (e) => {
      if (!openOptions.contains(e.target) && e.target !== openBtn) {
        document.body.removeChild(openOptions);
        document.removeEventListener('mousedown', closePopup);
      }
    };
    
    document.addEventListener('mousedown', closePopup);
  });
  
  document.getElementById('btnSave').addEventListener('click', saveFile);
  document.getElementById('btnFormat').addEventListener('click', formatJSON);
  document.getElementById('btnCompress').addEventListener('click', compressJSON);
  document.getElementById('btnValidate').addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    showValidateOptions(event);
  });
  document.getElementById('btnTreeView').addEventListener('click', toggleTreeView);
  document.getElementById('btnFind').addEventListener('click', toggleSearch);
  document.getElementById('btnCompare').addEventListener('click', showCompare);
  
  // Tree view controls
  document.getElementById('btnExpandAll').addEventListener('click', expandAllNodes);
  document.getElementById('btnCollapseAll').addEventListener('click', collapseAllNodes);
  document.getElementById('btnCopyPath').addEventListener('click', () => {
    // Implementation for copying current JSON path
  });
  
  // Search controls
  document.getElementById('searchInput').addEventListener('input', debounce(performSearch, 300));
  document.getElementById('searchCaseSensitive').addEventListener('change', performSearch);
  document.getElementById('searchRegex').addEventListener('change', performSearch);
  document.getElementById('btnPrevMatch').addEventListener('click', prevSearchResult);
  document.getElementById('btnNextMatch').addEventListener('click', nextSearchResult);
  document.getElementById('btnCloseSearch').addEventListener('click', toggleSearch);
  
  // URL import modal
  document.getElementById('btnImportUrl').addEventListener('click', handleUrlImport);
  
  // Initialize modal close buttons
  document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
      const modalId = closeBtn.getAttribute('data-modal');
      closeModal(modalId);
    });
  });
  
  // Close modals when clicking outside
  window.addEventListener('click', (event) => {
    document.querySelectorAll('.modal').forEach(modal => {
      // Skip compareModal and schemaValidationModal - these should only close with the X button
      if (modal.id === 'compareModal' || modal.id === 'schemaValidationModal') {
        return;
      }
      
      if (event.target === modal) {
        modal.style.display = 'none';
      }
    });
  });
  
  // Set up initial UI state - Tree view is hidden by default
  isTreeViewVisible = false;
  document.getElementById('tree-container').classList.add('hidden');
  document.getElementById('btnTreeView').classList.remove('btn-active');
  
  // Keyboard shortcuts
  window.addEventListener('keydown', (event) => {
    // Escape key closes modals and search
    if (event.key === 'Escape') {
      document.querySelectorAll('.modal').forEach(modal => {
        // Skip compareModal and schemaValidationModal - these should only close with the X button
        if (modal.id === 'compareModal' || modal.id === 'schemaValidationModal') {
          return;
        }
        
        modal.style.display = 'none';
      });
      
      if (!document.getElementById('searchContainer').classList.contains('hidden')) {
        toggleSearch();
      }
    }
  });
  
  // Set up IPC event listeners
  window.api.receiveNewFile(newFile);
  window.api.receiveSaveRequest(saveFile);
  window.api.receiveSaveAsRequest(saveFileAs);
  window.api.receiveFormatRequest(formatJSON);
  window.api.receiveCompressRequest(compressJSON);
  window.api.receiveValidateRequest(() => validateJSON(true));
  window.api.receiveToggleTreeView(toggleTreeView);
  window.api.receiveFindRequest(toggleSearch);
  window.api.receiveCollapseAll(collapseAllNodes);
  window.api.receiveExpandAll(expandAllNodes);
  window.api.receiveImportUrlRequest(importFromUrl);
  window.api.receiveImportClipboard(importFromClipboard);
  window.api.receiveExportClipboardRequest(exportToClipboard);
  window.api.receiveExportComplete(msg => updateStatus(msg, 'success'));
  window.api.receiveSchemaLoaded((data) => {
    try {
      currentSchema = JSON.parse(data.content);
      document.getElementById('schema-info').textContent = `Schema: ${data.path.split('/').pop()}`;
      updateStatus('Schema loaded successfully', 'success');
    } catch (error) {
      updateStatus(`Invalid schema: ${error.message}`, 'error');
    }
  });
  window.api.receiveGenerateSchemaRequest(generateSchema);
  window.api.receiveValidateSchemaRequest(() => validateAgainstSchema(true));
  window.api.receiveClearSchemaRequest(() => {
    currentSchema = null;
    document.getElementById('schema-info').textContent = 'No schema loaded';
    updateStatus('Schema cleared', 'success');
  });
  window.api.receiveShowShortcutsRequest(showShortcuts);
  
  window.api.receiveFileOpened((data) => {
    editor.setValue(data.content, -1);
    updateFileInfo(data.path);
    updateStatus('File loaded successfully', 'success');
  });
  
  // Add event listener for the Choose Folder button
  document.getElementById('btnChooseFolderSidebar').addEventListener('click', chooseFolderForSidebar);
  document.getElementById('btnRefreshFolder').addEventListener('click', refreshFolderInSidebar);
  document.getElementById('btnCloseSidebar').addEventListener('click', toggleFileExplorer);
  
  // Add handler for file explorer toggle menu action
  window.api.receiveToggleFileExplorer(() => {
    toggleFileExplorer();
  });
  
  // AI Features event listeners
  document.getElementById('btnSettings').addEventListener('click', showSettings);
  document.getElementById('btnSaveSettings').addEventListener('click', saveSettings);
  document.getElementById('btnToggleApiKey').addEventListener('click', toggleApiKeyVisibility);
  
  document.getElementById('btnAiFeatures').addEventListener('click', showAiToolsMenu);
  document.getElementById('menuExplainJson').addEventListener('click', showExplainJsonModal);
  document.getElementById('menuFixJson').addEventListener('click', showFixJsonModal);
  document.getElementById('menuSmartSearch').addEventListener('click', showSmartSearchModal);
  document.getElementById('menuAiSchema').addEventListener('click', showAiSchemaGenerator);
  document.getElementById('menuMockData').addEventListener('click', showMockDataModal);
  
  document.getElementById('menuExplainJsonKey').addEventListener('click', explainJsonKey);
  document.getElementById('menuCopyJsonPath').addEventListener('click', () => {
    if (selectedJsonPath) {
      navigator.clipboard.writeText(selectedJsonPath);
      updateStatus('Path copied to clipboard', 'success');
      document.getElementById('jsonKeyContextMenu').classList.add('hidden');
    }
  });
  
  document.getElementById('btnRunSmartSearch').addEventListener('click', runSmartSearch);
  document.getElementById('smartSearchQuery').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') runSmartSearch();
  });
  
  document.getElementById('btnGenerateMockData').addEventListener('click', generateMockData);
  document.getElementById('btnUseMockData').addEventListener('click', useMockData);
  
  document.getElementById('btnApplyFix').addEventListener('click', applyFixedJson);
  
  // Set up context menu for JSON tree
  setupJsonTreeContextMenu();
  
  // Load editor settings
  const savedTheme = localStorage.getItem('editorTheme');
  const savedFontSize = localStorage.getItem('editorFontSize');
  
  if (savedTheme) {
    editor.setTheme(savedTheme);
    document.getElementById('editorTheme').value = savedTheme;
  }
  
  if (savedFontSize) {
    editor.setOptions({ fontSize: savedFontSize });
    document.getElementById('editorFontSize').value = savedFontSize;
  }
}); 

// Initialize schema validation modal
function initSchemaValidationModal() {
  // Create modal HTML dynamically if it doesn't exist
  if (!document.getElementById('schemaValidationModal')) {
    const modal = document.createElement('div');
    modal.id = 'schemaValidationModal';
    modal.className = 'modal';
    
    modal.innerHTML = `
      <div class="modal-content modal-content-large">
        <div class="modal-header">
          <h2><i class="fas fa-file-code"></i> Schema Validation</h2>
          <span class="close" data-modal="schemaValidationModal">&times;</span>
        </div>
        <div class="modal-body">
          <div class="schema-validation-container">
            <div class="schema-json-editors">
              <div class="schema-editor-container">
                <div class="panel-header">
                  <span>Schema (JSON Schema)</span>
                  <button id="btnCopySchema" class="btn-sm">
                    <i class="fas fa-copy"></i> Copy
                  </button>
                  <button id="btnPasteSchema" class="btn-sm">
                    <i class="fas fa-paste"></i> Paste
                  </button>
                </div>
                <div id="schemaValidationEditor" class="editor"></div>
              </div>
              <div class="schema-editors-resizer"></div>
              <div class="schema-editor-container">
                <div class="panel-header">
                  <span>JSON Data</span>
                  <button id="btnCopyJson" class="btn-sm">
                    <i class="fas fa-copy"></i> Copy
                  </button>
                  <button id="btnPasteJson" class="btn-sm">
                    <i class="fas fa-paste"></i> Paste
                  </button>
                  <button id="btnUseCurrentJson" class="btn-sm">
                    <i class="fas fa-file-import"></i> Use Current
                  </button>
                </div>
                <div id="jsonValidationEditor" class="editor"></div>
              </div>
            </div>
            <div class="schema-results-resizer"></div>
            <div class="validation-results-container">
              <div class="panel-header">
                <span>Validation Results</span>
                <button id="btnCopyResults" class="btn-sm">
                  <i class="fas fa-copy"></i> Copy
                </button>
                <button id="btnValidateSchema" class="btn primary-btn">
                  <i class="fas fa-check-circle"></i> Validate
                </button>
              </div>
              <div id="schemaValidationResults" class="validation-results"></div>
            </div>
          </div>
        </div>
        <div class="resize-handle"></div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners for the close button
    modal.querySelector('.close').addEventListener('click', () => {
      closeModal('schemaValidationModal');
    });
  }
  
  // Initialize the editors
  const schemaEditor = ace.edit('schemaValidationEditor');
  schemaEditor.setTheme('ace/theme/textmate');
  schemaEditor.session.setMode('ace/mode/json');
  schemaEditor.setOptions({
    enableBasicAutocompletion: true,
    enableLiveAutocompletion: true,
    showPrintMargin: false,
    fontSize: '14px',
    tabSize: 2
  });
  schemaEditor.setValue('{\n  "$schema": "http://json-schema.org/draft-07/schema#",\n  "type": "object"\n}', -1);

  const jsonEditor = ace.edit('jsonValidationEditor');
  jsonEditor.setTheme('ace/theme/textmate');
  jsonEditor.session.setMode('ace/mode/json');
  jsonEditor.setOptions({
    enableBasicAutocompletion: true,
    enableLiveAutocompletion: true,
    showPrintMargin: false,
    fontSize: '14px',
    tabSize: 2
  });
  jsonEditor.setValue('{\n  \n}', -1);

  // Set up button event handlers
  document.getElementById('btnCopySchema').addEventListener('click', () => {
    navigator.clipboard.writeText(schemaEditor.getValue());
    updateStatus('Schema copied to clipboard', 'success');
  });
  
  document.getElementById('btnPasteSchema').addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      schemaEditor.setValue(text, -1);
    } catch (err) {
      updateStatus('Failed to read clipboard: ' + err.message, 'error');
    }
  });
  
  document.getElementById('btnCopyJson').addEventListener('click', () => {
    navigator.clipboard.writeText(jsonEditor.getValue());
    updateStatus('JSON copied to clipboard', 'success');
  });
  
  document.getElementById('btnPasteJson').addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      jsonEditor.setValue(text, -1);
    } catch (err) {
      updateStatus('Failed to read clipboard: ' + err.message, 'error');
    }
  });
  
  document.getElementById('btnUseCurrentJson').addEventListener('click', () => {
    jsonEditor.setValue(editor.getValue(), -1);
  });
  
  document.getElementById('btnCopyResults').addEventListener('click', () => {
    const resultsText = document.getElementById('schemaValidationResults').textContent;
    navigator.clipboard.writeText(resultsText);
    updateStatus('Results copied to clipboard', 'success');
  });
  
  document.getElementById('btnValidateSchema').addEventListener('click', () => {
    validateJsonWithSchema(schemaEditor.getValue(), jsonEditor.getValue());
  });
  
  // Setup resizable functionality
  setupSchemaValidationResizing();
}

// Setup resizable functionality for the schema validation modal
function setupSchemaValidationResizing() {
  // Horizontal resize between schema and JSON editors
  const editorsResizer = document.querySelector('.schema-editors-resizer');
  const schemaEditors = document.querySelector('.schema-json-editors');
  
  if (!editorsResizer || !schemaEditors) return;
  
  const schemaEditorLeft = schemaEditors.querySelector('.schema-editor-container:first-child');
  const schemaEditorRight = schemaEditors.querySelector('.schema-editor-container:last-child');
  
  let isResizingEditors = false;
  let startX, startLeftWidth, startRightWidth;
  
  editorsResizer.addEventListener('mousedown', (e) => {
    isResizingEditors = true;
    startX = e.clientX;
    
    const leftRect = schemaEditorLeft.getBoundingClientRect();
    const rightRect = schemaEditorRight.getBoundingClientRect();
    startLeftWidth = leftRect.width;
    startRightWidth = rightRect.width;
    
    document.body.classList.add('resizing');
    e.preventDefault();
  });
  
  // Vertical resize for results panel
  const resultsResizer = document.querySelector('.schema-results-resizer');
  const resultsContainer = document.querySelector('.validation-results-container');
  
  if (resultsResizer && resultsContainer) {
    const jsonEditors = document.querySelector('.schema-json-editors');
    
    let isResizingResults = false;
    let startY, startResultsHeight, startEditorsHeight;
    
    resultsResizer.addEventListener('mousedown', (e) => {
      isResizingResults = true;
      startY = e.clientY;
      
      const resultsRect = resultsContainer.getBoundingClientRect();
      const editorsRect = jsonEditors.getBoundingClientRect();
      startResultsHeight = resultsRect.height;
      startEditorsHeight = editorsRect.height;
      
      document.body.classList.add('resizing');
      e.preventDefault();
    });
  }
  
  // Mouse move handler for both resizers
  document.addEventListener('mousemove', (e) => {
    if (isResizingEditors) {
      const deltaX = e.clientX - startX;
      const totalWidth = startLeftWidth + startRightWidth;
      
      // Calculate new widths ensuring minimum size
      let newLeftWidth = startLeftWidth + deltaX;
      let newRightWidth = startRightWidth - deltaX;
      
      // Ensure minimum width of 20% for each panel
      const minWidth = totalWidth * 0.2;
      if (newLeftWidth < minWidth) {
        newLeftWidth = minWidth;
        newRightWidth = totalWidth - minWidth;
      } else if (newRightWidth < minWidth) {
        newRightWidth = minWidth;
        newLeftWidth = totalWidth - minWidth;
      }
      
      // Apply new widths as percentages
      const leftPercentage = (newLeftWidth / totalWidth) * 100;
      const rightPercentage = (newRightWidth / totalWidth) * 100;
      
      schemaEditorLeft.style.flex = `0 0 ${leftPercentage}%`;
      schemaEditorRight.style.flex = `0 0 ${rightPercentage}%`;
      
      // Resize editors
      resizeAceEditors();
    }
    
    if (typeof isResizingResults !== 'undefined' && isResizingResults) {
      const resultsResizer = document.querySelector('.schema-results-resizer');
      const resultsContainer = document.querySelector('.validation-results-container');
      const jsonEditors = document.querySelector('.schema-json-editors');
      
      if (resultsResizer && resultsContainer && jsonEditors) {
        const deltaY = startY - e.clientY;
        const newResultsHeight = Math.max(100, startResultsHeight + deltaY);
        
        // Set new height for results container
        resultsContainer.style.height = `${newResultsHeight}px`;
        
        // Resize editors
        resizeAceEditors();
      }
    }
  });
  
  // Mouse up handler to stop resizing
  document.addEventListener('mouseup', () => {
    if (isResizingEditors) {
      isResizingEditors = false;
      document.body.classList.remove('resizing');
    }
    
    if (typeof isResizingResults !== 'undefined' && isResizingResults) {
      isResizingResults = false;
      document.body.classList.remove('resizing');
    }
  });
  
  // Handle modal resize to update editors
  const modalContent = document.querySelector('#schemaValidationModal .modal-content');
  if (modalContent) {
    modalContent.addEventListener('mouseup', () => {
      // Small delay to ensure the resize has completed
      setTimeout(resizeAceEditors, 100);
    });
    
    // Set up resize observer if supported
    if (window.ResizeObserver) {
      const resizeObserver = new ResizeObserver(() => {
        resizeAceEditors();
      });
      resizeObserver.observe(modalContent);
    }
  }
}

// Resize ACE editors when the container size changes
function resizeAceEditors() {
  const schemaEditor = ace.edit('schemaValidationEditor');
  const jsonEditor = ace.edit('jsonValidationEditor');
  
  if (schemaEditor && jsonEditor) {
    schemaEditor.resize();
    jsonEditor.resize();
  }
}

// Show schema validation modal with improved resizing
function showSchemaValidationModal() {
  openModal('schemaValidationModal');
  
  // Resize editors immediately and after a short delay for DOM rendering
  resizeAceEditors();
  setTimeout(resizeAceEditors, 100);
}

// ... existing code ...

// Show validation options dropdown
function showValidateOptions(event) {
  // Remove any existing validation options popup
  const existingPopup = document.querySelector('.validate-options-popup');
  if (existingPopup) {
    document.body.removeChild(existingPopup);
    return;
  }
  
  // Create popup element
  const validateOptions = document.createElement('div');
  validateOptions.className = 'validate-options-popup';
  validateOptions.innerHTML = `
    <button id="btnSimpleValidate" class="btn">
      <i class="fas fa-check-circle"></i> Validate JSON
    </button>
    <button id="btnSchemaValidate" class="btn">
      <i class="fas fa-file-check"></i> Schema Validation
    </button>
  `;
  
  document.body.appendChild(validateOptions);
  
  // Position the popup near the Validate button
  const validateBtn = event.currentTarget;
  const rect = validateBtn.getBoundingClientRect();
  validateOptions.style.top = `${rect.bottom + 5}px`;
  validateOptions.style.left = `${rect.left}px`;
  
  // Add event listeners
  document.getElementById('btnSimpleValidate').addEventListener('click', () => {
    document.body.removeChild(validateOptions);
    validateJSON(true);
  });
  
  document.getElementById('btnSchemaValidate').addEventListener('click', () => {
    document.body.removeChild(validateOptions);
    showSchemaValidationModal();
  });
  
  // Close the popup when clicking outside
  const closePopup = (e) => {
    if (!validateOptions.contains(e.target) && e.target !== validateBtn) {
      document.body.removeChild(validateOptions);
      document.removeEventListener('mousedown', closePopup);
    }
  };
  
  document.addEventListener('mousedown', closePopup);
}

// Add CSS styles for the schema validation modal
function addSchemaValidationStyles() {
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .schema-validation-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      flex: 1 1 auto;
    }
    
    .schema-json-editors {
      display: flex;
      flex: 1 1 auto;
      gap: 10px;
      margin-bottom: 10px;
      min-height: 250px;
      overflow: hidden;
    }
    
    .schema-editor-container {
      flex: 1 1 50%;
      display: flex;
      flex-direction: column;
      border: 1px solid #ccc;
      border-radius: 4px;
      position: relative;
      overflow: hidden;
    }
    
    .panel-header {
      display: flex;
      align-items: center;
      padding: 5px 10px;
      background-color: #f5f5f5;
      border-bottom: 1px solid #ccc;
      flex: 0 0 auto;
    }
    
    .panel-header span {
      flex: 1;
      font-weight: bold;
    }
    
    .panel-header button {
      margin-left: 5px;
    }
    
    #schemaValidationEditor, #jsonValidationEditor {
      flex: 1 1 auto;
      height: 100%;
      min-height: 100px;
      width: 100%;
    }
    
    .validation-results-container {
      flex: 1;
      min-height: 200px;
      border: 1px solid #ccc;
      border-radius: 4px;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }
    
    #schemaValidationResults {
      flex: 1 1 auto;
      padding: 0;
      overflow-y: auto;
      background-color: #f9f9f9;
      height: calc(100% - 40px);
    }
    
    .validation-error-item {
      margin: 0;
      padding: 10px 15px;
      border-bottom: 1px solid #eee;
      background-color: #fff;
    }
    
    .error-path {
      font-weight: bold;
      margin-bottom: 3px;
      display: block;
      padding-left: 10px;
      border-left: 3px solid #dc3545;
    }
    
    .error-message {
      padding-left: 13px;
      font-size: 0.9em;
      color: #555;
    }
    
    .validation-error-header {
      background-color: #f8d7da;
      color: #721c24;
      padding: 12px 15px;
      border-bottom: 1px solid #f5c6cb;
      font-weight: bold;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .validation-error-header .error-icon {
      color: #dc3545;
      font-size: 1.2em;
    }
    
    .validation-success {
      background-color: #d4edda;
      color: #155724;
      padding: 15px;
      border-radius: 4px;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .validate-options-popup {
      position: absolute;
      background-color: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      z-index: 1000;
      display: flex;
      flex-direction: column;
      min-width: 150px;
    }
    
    .validate-options-popup button {
      padding: 8px 10px;
      text-align: left;
      border: none;
      background: none;
      cursor: pointer;
    }
    
    .validate-options-popup button:hover {
      background-color: #f5f5f5;
    }
    
    /* Resizable handles */
    .schema-results-resizer {
      position: absolute;
      height: 5px;
      width: 100%;
      background-color: transparent;
      cursor: ns-resize;
      top: -3px;
      left: 0;
      z-index: 10;
    }
    
    .schema-editors-resizer {
      position: absolute;
      width: 5px;
      height: 100%;
      background-color: transparent;
      cursor: ew-resize;
      top: 0;
      left: 50%;
      z-index: 10;
    }
    
    .resizing {
      user-select: none;
    }
  `;
  document.head.appendChild(styleEl);
}

// Validate JSON data against a JSON Schema
function validateJsonWithSchema(schemaText, jsonText) {
  const resultsContainer = document.getElementById('schemaValidationResults');
  resultsContainer.innerHTML = '';
  
  try {
    // Parse the schema and JSON
    let schema, jsonData;
    
    try {
      schema = JSON.parse(schemaText);
    } catch (err) {
      resultsContainer.innerHTML = '<div class="validation-error-header"><span class="error-icon">❌</span>Error parsing schema: ' + err.message + '</div>';
      return;
    }
    
    try {
      jsonData = JSON.parse(jsonText);
    } catch (err) {
      resultsContainer.innerHTML = '<div class="validation-error-header"><span class="error-icon">❌</span>Error parsing JSON: ' + err.message + '</div>';
      return;
    }
    
    // Perform the validation
    const validationResult = validateWithJsonSchema(jsonData, schema);
    
    if (validationResult.valid) {
      resultsContainer.innerHTML = '<div class="validation-success"><span>✅</span> Validation successful! The JSON data is valid according to the schema.</div>';
    } else {
      // Format and display the errors
      resultsContainer.innerHTML = '<div class="validation-error-header"><span class="error-icon">❌</span>Validation failed with the following errors:</div>';
      
      validationResult.errors.forEach(error => {
        const errorItem = document.createElement('div');
        errorItem.className = 'validation-error-item';
        
        const errorPath = document.createElement('div');
        errorPath.className = 'error-path';
        errorPath.textContent = `Path: ${error.path}`;
        
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.textContent = error.message;
        
        errorItem.appendChild(errorPath);
        errorItem.appendChild(errorMessage);
        resultsContainer.appendChild(errorItem);
      });
    }
  } catch (error) {
    resultsContainer.innerHTML = '<div class="validation-error-header"><span class="error-icon">❌</span>Error during validation: ' + error.message + '</div>';
  }
}

// Comprehensive JSON Schema validation
function validateWithJsonSchema(data, schema) {
  const result = { valid: true, errors: [] };
  
  // Helper function to collect errors
  function addError(path, message) {
    result.valid = false;
    result.errors.push({ path, message });
  }
  
  // Check type
  function validateType(data, schema, path) {
    const dataType = getJsonType(data);
    
    if (schema.type) {
      // Handle array of types
      const types = Array.isArray(schema.type) ? schema.type : [schema.type];
      
      if (!types.includes(dataType) && 
          !(types.includes('integer') && dataType === 'number' && Number.isInteger(data))) {
        addError(path, `Expected type ${types.join(' or ')}, got ${dataType}`);
        return false;
      }
    }
    return true;
  }
  
  // Get JSON type
  function getJsonType(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
    return typeof value;
  }
  
  // Validate required properties
  function validateRequired(data, schema, path) {
    if (schema.required && typeof data === 'object' && !Array.isArray(data)) {
      schema.required.forEach(prop => {
        if (data[prop] === undefined) {
          addError(`${path}${path ? '.' : ''}${prop}`, `Required property '${prop}' is missing`);
        }
      });
    }
  }
  
  // Validate properties
  function validateProperties(data, schema, path) {
    if (schema.properties && typeof data === 'object' && !Array.isArray(data)) {
      for (const prop in data) {
        const propPath = `${path}${path ? '.' : ''}${prop}`;
        
        if (schema.properties[prop]) {
          validateSchema(data[prop], schema.properties[prop], propPath);
        } else if (schema.additionalProperties === false) {
          addError(propPath, `Additional property '${prop}' is not allowed`);
        } else if (typeof schema.additionalProperties === 'object') {
          validateSchema(data[prop], schema.additionalProperties, propPath);
        }
      }
    }
  }
  
  // Validate array items
  function validateItems(data, schema, path) {
    if (Array.isArray(data) && schema.items) {
      if (Array.isArray(schema.items)) {
        // Tuple validation
        const minItems = Math.min(data.length, schema.items.length);
        for (let i = 0; i < minItems; i++) {
          validateSchema(data[i], schema.items[i], `${path}[${i}]`);
        }
        
        // Validate additional items
        if (data.length > schema.items.length) {
          if (schema.additionalItems === false) {
            addError(path, `Array has more items than allowed`);
          } else if (typeof schema.additionalItems === 'object') {
            for (let i = schema.items.length; i < data.length; i++) {
              validateSchema(data[i], schema.additionalItems, `${path}[${i}]`);
            }
          }
        }
      } else {
        // Each item must validate against the same schema
        for (let i = 0; i < data.length; i++) {
          validateSchema(data[i], schema.items, `${path}[${i}]`);
        }
      }
    }
  }
  
  // Validate minItems and maxItems
  function validateArrayLength(data, schema, path) {
    if (Array.isArray(data)) {
      if (schema.minItems !== undefined && data.length < schema.minItems) {
        addError(path, `Array must have at least ${schema.minItems} items`);
      }
      
      if (schema.maxItems !== undefined && data.length > schema.maxItems) {
        addError(path, `Array must have at most ${schema.maxItems} items`);
      }
    }
  }
  
  // Validate string length
  function validateStringLength(data, schema, path) {
    if (typeof data === 'string') {
      if (schema.minLength !== undefined && data.length < schema.minLength) {
        addError(path, `String must be at least ${schema.minLength} characters long`);
      }
      
      if (schema.maxLength !== undefined && data.length > schema.maxLength) {
        addError(path, `String must be at most ${schema.maxLength} characters long`);
      }
      
      if (schema.pattern) {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(data)) {
          addError(path, `String must match pattern: ${schema.pattern}`);
        }
      }
    }
  }
  
  // Validate numeric constraints
  function validateNumericConstraints(data, schema, path) {
    if (typeof data === 'number') {
      if (schema.minimum !== undefined) {
        if ((schema.exclusiveMinimum === true && data <= schema.minimum) ||
            (schema.exclusiveMinimum !== true && data < schema.minimum)) {
          addError(path, `Value must be ${schema.exclusiveMinimum ? 'greater than' : 'greater than or equal to'} ${schema.minimum}`);
        }
      }
      
      if (schema.maximum !== undefined) {
        if ((schema.exclusiveMaximum === true && data >= schema.maximum) ||
            (schema.exclusiveMaximum !== true && data > schema.maximum)) {
          addError(path, `Value must be ${schema.exclusiveMaximum ? 'less than' : 'less than or equal to'} ${schema.maximum}`);
        }
      }
      
      if (schema.multipleOf !== undefined) {
        const remainder = data % schema.multipleOf;
        if (remainder !== 0 && Math.abs(remainder - schema.multipleOf) > 1e-10) {
          addError(path, `Value must be a multiple of ${schema.multipleOf}`);
        }
      }
    }
  }
  
  // Validate enum
  function validateEnum(data, schema, path) {
    if (schema.enum !== undefined) {
      let found = false;
      for (const val of schema.enum) {
        if (JSON.stringify(data) === JSON.stringify(val)) {
          found = true;
          break;
        }
      }
      
      if (!found) {
        addError(path, `Value must be one of the enumerated values`);
      }
    }
  }
  
  // Main validation function
  function validateSchema(data, schema, path = '') {
    // Skip validation if data is undefined and the property is not required
    if (data === undefined) return;
    
    // Check type first
    if (!validateType(data, schema, path)) return;
    
    // Validate according to the data type
    validateRequired(data, schema, path);
    validateProperties(data, schema, path);
    validateItems(data, schema, path);
    validateArrayLength(data, schema, path);
    validateStringLength(data, schema, path);
    validateNumericConstraints(data, schema, path);
    validateEnum(data, schema, path);
    
    // Handle format if present (common formats like date, email, etc.)
    if (schema.format && typeof data === 'string') {
      switch(schema.format) {
        case 'email':
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data)) {
            addError(path, `Must be a valid email address`);
          }
          break;
        case 'uri':
        case 'url':
          try {
            new URL(data);
          } catch (e) {
            addError(path, `Must be a valid URL`);
          }
          break;
        case 'date':
          const dateVal = new Date(data);
          if (isNaN(dateVal.getTime())) {
            addError(path, `Must be a valid date`);
          }
          break;
        case 'date-time':
          const dateTimeVal = new Date(data);
          if (isNaN(dateTimeVal.getTime())) {
            addError(path, `Must be a valid date-time`);
          }
          break;
        // Add more formats as needed
      }
    }
    
    // Handle uniqueItems for arrays
    if (Array.isArray(data) && schema.uniqueItems === true) {
      const uniqueItems = new Set();
      const duplicates = [];
      
      for (let i = 0; i < data.length; i++) {
        const item = JSON.stringify(data[i]);
        if (uniqueItems.has(item)) {
          duplicates.push(i);
        } else {
          uniqueItems.add(item);
        }
      }
      
      if (duplicates.length > 0) {
        addError(path, `Array items must be unique (duplicates at positions: ${duplicates.join(', ')})`);
      }
    }
  }
  
  // Start validation from root
  validateSchema(data, schema);
  return result;
}

// Function to show snackbar notification
function showSnackbar(message, icon = 'check-circle') {
  const snackbar = document.getElementById('snackbar');
  snackbar.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
  snackbar.className = 'show';
  
  // After 3 seconds, remove the show class
  setTimeout(() => { 
    snackbar.className = snackbar.className.replace('show', ''); 
  }, 3000);
}

// Set up event listener for copying AI Schema to clipboard
document.addEventListener('DOMContentLoaded', function() {
  const copyAiSchemaBtn = document.getElementById('btnCopyAiSchema');
  if (copyAiSchemaBtn) {
    copyAiSchemaBtn.addEventListener('click', function() {
      const schemaText = document.getElementById('aiSchemaResults').textContent;
      navigator.clipboard.writeText(schemaText)
        .then(() => {
          updateStatus('Schema copied to clipboard', 'success');
          showSnackbar('Schema copied to clipboard');
        })
        .catch(err => {
          updateStatus(`Failed to copy: ${err}`, 'error');
          showSnackbar('Failed to copy to clipboard', 'exclamation-circle');
        });
    });
  }
});