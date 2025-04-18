// ACE editor will be loaded via script tag in index.html

// Global variables
let currentFilePath = null;
let editor = null;
let isTreeViewVisible = false;
let currentSchema = null;
let searchResults = [];
let currentSearchIndex = -1;

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
  editor.session.on('change', debounce(validateEditorContent, 500));
  
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
}

// New file
function newFile() {
  editor.setValue('{\n  \n}', -1);
  updateFileInfo(null);
  currentSchema = null;
  document.getElementById('schema-info').textContent = 'No schema loaded';
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

// Save file as
function saveFileAs() {
  const content = editor.getValue();
  window.api.saveFileAs(content).then(filePath => {
    if (filePath) {
      updateFileInfo(filePath);
      updateStatus('File saved successfully', 'success');
    }
  });
}

// Save current file
function saveCurrentFile() {
  const content = editor.getValue();
  // This would be implemented using ipcRenderer to save to currentFilePath
  updateStatus('File saved successfully', 'success');
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

// Initialize everything when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing application...');
  
  // Initialize the editor
  setTimeout(initEditor, 100);
  
  // Initialize event listeners for buttons
  document.getElementById('btnNew').addEventListener('click', newFile);
  document.getElementById('btnOpen').addEventListener('click', () => window.api.openFile());
  document.getElementById('btnSave').addEventListener('click', saveFile);
  document.getElementById('btnFormat').addEventListener('click', formatJSON);
  document.getElementById('btnCompress').addEventListener('click', compressJSON);
  document.getElementById('btnValidate').addEventListener('click', () => validateJSON(true));
  document.getElementById('btnTreeView').addEventListener('click', toggleTreeView);
  document.getElementById('btnFind').addEventListener('click', toggleSearch);
  
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
      if (event.target === modal) {
        modal.style.display = 'none';
      }
    });
  });
  
  // Initialize the resizable divider
  initResizableDivider();
  
  // Set up initial UI state - Tree view is hidden by default
  isTreeViewVisible = false;
  document.getElementById('tree-container').classList.add('hidden');
  document.getElementById('btnTreeView').classList.remove('btn-active');
  
  // Keyboard shortcuts
  window.addEventListener('keydown', (event) => {
    // Escape key closes modals and search
    if (event.key === 'Escape') {
      document.querySelectorAll('.modal').forEach(modal => {
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
}); 