// src/components/FileEditor.js
import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

const MODES = {
  VIEW: 'view',
  EDIT: 'edit',
  DRAG: 'drag',
  SELECT: 'select'
};

const ItemTypes = {
  BLOCK: 'block'
};

const parseContent = (content) => {
  if (!content) return content;
  
  const parts = [];
  let lastIndex = 0;
  
  // Combined regex for all formatting tags
  const formatRegex = /<(link|b|i|c=([^>]+))>(.*?)<\/(?:link|b|i|c)>/g;
  let match;

  while ((match = formatRegex.exec(content)) !== null) {
    const [fullMatch, tag, colorValue, innerText] = match;
    const start = match.index;

    // Add text before this match
    if (start > lastIndex) {
      parts.push(content.slice(lastIndex, start));
    }

    // Handle different tag types
    if (tag === 'link') {
      parts.push(
        <a key={start} href={innerText} target="_blank" rel="noopener noreferrer" style={{ color: '#007bff' }}>
          {innerText}
        </a>
      );
    } else if (tag === 'b') {
      parts.push(
        <strong key={start}>
          {innerText}
        </strong>
      );
    } else if (tag === 'i') {
      parts.push(
        <em key={start}>
          {innerText}
        </em>
      );
    } else if (tag.startsWith('c=')) {
      parts.push(
        <span key={start} style={{ color: colorValue }}>
          {innerText}
        </span>
      );
    }

    lastIndex = formatRegex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? parts : content;
}

// LaTeX Renderer Component
const LaTeXRenderer = ({ latex }) => {
  // Enhanced LaTeX to HTML converter
  const renderLaTeX = (latex) => {
    if (!latex) return '';
    
    let html = latex;
    
    // Replace common LaTeX commands with HTML/Unicode equivalents
    const replacements = [
      // Fractions - improved rendering
      [/\\frac\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, 
       '<span class="fraction"><span class="fraction-line"><span class="numerator">$1</span><span class="denominator">$2</span></span></span>'],
      
      // Superscripts and subscripts - improved handling
      [/\^(\w+|\{[^}]+\})/g, (match, p1) => `<sup>${p1.replace(/[{}]/g, '')}</sup>`],
      [/_(\w+|\{[^}]+\})/g, (match, p1) => `<sub>${p1.replace(/[{}]/g, '')}</sub>`],
      
      // Square roots - better rendering
      [/\\sqrt\{([^}]+)\}/g, '<span class="sqrt">√<span class="sqrt-content">$1</span></span>'],
      [/\\sqrt\[(\d+)\]\{([^}]+)\}/g, '<span class="nth-root"><sup class="root-index">$1</sup>√<span class="sqrt-content">$2</span></span>'],
      
      // Powers and squares - special handling
      [/\^2(?!\d)/g, '²'],
      [/\^3(?!\d)/g, '³'],
      [/\^4(?!\d)/g, '⁴'],
      [/\^5(?!\d)/g, '⁵'],
      [/\^6(?!\d)/g, '⁶'],
      [/\^7(?!\d)/g, '⁷'],
      [/\^8(?!\d)/g, '⁸'],
      [/\^9(?!\d)/g, '⁹'],
      [/\^0(?!\d)/g, '⁰'],
      [/\^1(?!\d)/g, '¹'],
      
      // Subscripts
      [/_0(?!\d)/g, '₀'],
      [/_1(?!\d)/g, '₁'],
      [/_2(?!\d)/g, '₂'],
      [/_3(?!\d)/g, '₃'],
      [/_4(?!\d)/g, '₄'],
      [/_5(?!\d)/g, '₅'],
      [/_6(?!\d)/g, '₆'],
      [/_7(?!\d)/g, '₇'],
      [/_8(?!\d)/g, '₈'],
      [/_9(?!\d)/g, '₉'],
      
      // Greek letters
      [/\\alpha/g, 'α'], [/\\beta/g, 'β'], [/\\gamma/g, 'γ'], [/\\delta/g, 'δ'],
      [/\\epsilon/g, 'ε'], [/\\zeta/g, 'ζ'], [/\\eta/g, 'η'], [/\\theta/g, 'θ'],
      [/\\iota/g, 'ι'], [/\\kappa/g, 'κ'], [/\\lambda/g, 'λ'], [/\\mu/g, 'μ'],
      [/\\nu/g, 'ν'], [/\\xi/g, 'ξ'], [/\\pi/g, 'π'], [/\\rho/g, 'ρ'],
      [/\\sigma/g, 'σ'], [/\\tau/g, 'τ'], [/\\upsilon/g, 'υ'], [/\\phi/g, 'φ'],
      [/\\chi/g, 'χ'], [/\\psi/g, 'ψ'], [/\\omega/g, 'ω'],
      
      // Capital Greek letters
      [/\\Alpha/g, 'Α'], [/\\Beta/g, 'Β'], [/\\Gamma/g, 'Γ'], [/\\Delta/g, 'Δ'],
      [/\\Epsilon/g, 'Ε'], [/\\Zeta/g, 'Ζ'], [/\\Eta/g, 'Η'], [/\\Theta/g, 'Θ'],
      [/\\Iota/g, 'Ι'], [/\\Kappa/g, 'Κ'], [/\\Lambda/g, 'Λ'], [/\\Mu/g, 'Μ'],
      [/\\Nu/g, 'Ν'], [/\\Xi/g, 'Ξ'], [/\\Pi/g, 'Π'], [/\\Rho/g, 'Ρ'],
      [/\\Sigma/g, 'Σ'], [/\\Tau/g, 'Τ'], [/\\Upsilon/g, 'Υ'], [/\\Phi/g, 'Φ'],
      [/\\Chi/g, 'Χ'], [/\\Psi/g, 'Ψ'], [/\\Omega/g, 'Ω'],
      
      // Mathematical symbols
      [/\\infty/g, '∞'], [/\\partial/g, '∂'], [/\\nabla/g, '∇'],
      [/\\pm/g, '±'], [/\\mp/g, '∓'], [/\\times/g, '×'], [/\\div/g, '÷'],
      [/\\neq/g, '≠'], [/\\leq/g, '≤'], [/\\geq/g, '≥'], [/\\approx/g, '≈'],
      [/\\equiv/g, '≡'], [/\\propto/g, '∝'], [/\\in/g, '∈'], [/\\notin/g, '∉'],
      [/\\subset/g, '⊂'], [/\\supset/g, '⊃'], [/\\cap/g, '∩'], [/\\cup/g, '∪'],
      [/\\int/g, '∫'], [/\\sum/g, '∑'], [/\\prod/g, '∏'],
      
      // Limits and integrals - improved
      [/\\sum_\{([^}]+)\}\^\{([^}]+)\}/g, '<span class="big-op">∑<sub class="op-sub">$1</sub><sup class="op-sup">$2</sup></span>'],
      [/\\int_\{([^}]+)\}\^\{([^}]+)\}/g, '<span class="big-op">∫<sub class="op-sub">$1</sub><sup class="op-sup">$2</sup></span>'],
      [/\\prod_\{([^}]+)\}\^\{([^}]+)\}/g, '<span class="big-op">∏<sub class="op-sub">$1</sub><sup class="op-sup">$2</sup></span>'],
      [/\\lim_\{([^}]+)\}/g, '<span class="limit">lim<sub class="op-sub">$1</sub></span>'],
      
      // Simple sums and integrals
      [/\\sum/g, '∑'], [/\\int/g, '∫'], [/\\prod/g, '∏'],
      
      // Parentheses
      [/\\left\(/g, '('], [/\\right\)/g, ')'],
      [/\\left\[/g, '['], [/\\right\]/g, ']'],
      [/\\left\{/g, '{'], [/\\right\}/g, '}'],
      
      // Text formatting
      [/\\text\{([^}]+)\}/g, '<span class="math-text">$1</span>'],
      [/\\mathbf\{([^}]+)\}/g, '<strong>$1</strong>'],
      [/\\mathit\{([^}]+)\}/g, '<em>$1</em>'],
      
      // Clean up extra spaces and backslashes
      [/\\\\/g, ''], // Remove double backslashes
      [/\s+/g, ' '], // Normalize spaces
    ];
    
    replacements.forEach(([pattern, replacement]) => {
      html = html.replace(pattern, replacement);
    });
    
    return html;
  };
  
  return (
    <div 
      className="latex-rendered" 
      dangerouslySetInnerHTML={{ __html: renderLaTeX(latex) }}
    />
  );
};
const DrawingCanvas = ({ content, onUpdate, isEditing }) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState(null);
  const canvasRef = useRef(null);
  
  const safeContent = content || { strokes: [], width: 400, height: 300 };
  
  useEffect(() => {
    redrawCanvas();
  }, [safeContent.strokes, safeContent.width, safeContent.height]);
  
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    safeContent.strokes.forEach(stroke => {
      if (stroke.points && stroke.points.length > 1) {
        ctx.strokeStyle = stroke.color || '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        stroke.points.forEach(point => {
          ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
      }
    });
  };
  
  const startDrawing = (e) => {
    if (!isEditing) return;
    
    const canvas = e.target;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newStroke = { points: [{ x, y }], color: '#000000' };
    setCurrentStroke(newStroke);
    setIsDrawing(true);
  };
  
  const draw = (e) => {
    if (!isDrawing || !currentStroke || !isEditing) return;
    
    const canvas = e.target;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const updatedStroke = {
      ...currentStroke,
      points: [...currentStroke.points, { x, y }]
    };
    setCurrentStroke(updatedStroke);
    
    // Draw on canvas immediately
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (updatedStroke.points.length > 1) {
      const prevPoint = updatedStroke.points[updatedStroke.points.length - 2];
      const currPoint = updatedStroke.points[updatedStroke.points.length - 1];
      
      ctx.beginPath();
      ctx.moveTo(prevPoint.x, prevPoint.y);
      ctx.lineTo(currPoint.x, currPoint.y);
      ctx.stroke();
    }
  };
  
  const stopDrawing = () => {
    if (isDrawing && currentStroke && isEditing) {
      const newContent = {
        ...safeContent,
        strokes: [...safeContent.strokes, currentStroke]
      };
      onUpdate(newContent);
    }
    setIsDrawing(false);
    setCurrentStroke(null);
  };
  
  const clearCanvas = () => {
    const newContent = {
      ...safeContent,
      strokes: []
    };
    onUpdate(newContent);
  };
  
  const updateDimensions = (field, value) => {
    const newContent = {
      ...safeContent,
      [field]: parseInt(value)
    };
    onUpdate(newContent);
  };
  
  return (
    <div className="drawing-canvas-container">
      <canvas
        ref={canvasRef}
        width={safeContent.width || 400}
        height={safeContent.height || 300}
        style={{ 
          border: '1px solid #ccc', 
          cursor: isEditing ? 'crosshair' : 'default' 
        }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
      {isEditing && (
        <div className="drawing-tools">
          <button onClick={clearCanvas}>Clear</button>
          <label>Width: 
            <input
              type="number"
              value={safeContent.width || 400}
              onChange={(e) => updateDimensions('width', e.target.value)}
              min="200"
              max="800"
            />
          </label>
          <label>Height: 
            <input
              type="number"
              value={safeContent.height || 300}
              onChange={(e) => updateDimensions('height', e.target.value)}
              min="150"
              max="600"
            />
          </label>
        </div>
      )}
    </div>
  );
};

const FileEditor = ({ selectedFile, setSelectedFile, folders, setFolders, currentPath }) => {
  const [fileName, setFileName] = useState('');
  const [blocks, setBlocks] = useState([]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [mode, setMode] = useState(MODES.VIEW);
  const [editingBlockId, setEditingBlockId] = useState(null);
  const [selectedBlocks, setSelectedBlocks] = useState([]);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [targetFileId, setTargetFileId] = useState(null);
  const [availableFiles, setAvailableFiles] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState(null);

  useEffect(() => {
    if (selectedFile) {
      setFileName(selectedFile.name);
      setBlocks(selectedFile.content || []);
    } else {
      setFileName('');
      setBlocks([]);
    }
    setMode(MODES.VIEW);
    setEditingBlockId(null);
    setSelectedBlocks([]);
  }, [selectedFile]);

  const updateFile = (updatedContent) => {
    const updateFolders = (folders, currentPathIndex = 0) => {
      return folders.map(folder => {
        if (currentPath.length > 0 && currentPath[currentPathIndex] === folder.id) {
          if (currentPathIndex < currentPath.length - 1) {
            return {
              ...folder,
              folders: updateFolders(folder.folders, currentPathIndex + 1)
            };
          }
          
          return {
            ...folder,
            files: folder.files.map(file => {
              if (file.id === selectedFile.id) {
                return {
                  ...file,
                  name: fileName,
                  content: updatedContent || blocks,
                  updatedAt: new Date().toISOString()
                };
              }
              return file;
            })
          };
        }
        return {
          ...folder,
          folders: updateFolders(folder.folders, currentPathIndex)
        };
      });
    };

    setFolders(prevFolders => updateFolders(prevFolders));
  };

  const handleNameChange = (e) => {
    setFileName(e.target.value);
  };

  const saveNameChange = () => {
    setIsEditingName(false);
    updateFile();
  };

  const addBlock = (type, index) => {
    const newBlock = {
      id: uuidv4(),
      type,
      content: type === 'heading' ? { text: 'Heading', fontSize: 24, color: '#000000' } : 
               type === 'list' ? { heading: 'List Heading', items: [{ text: 'Item 1', sublists: [], images: [], videos: [] }] } : 
               type === 'image' ? { images: [] } :
               type === 'video' ? { videos: [] } :
               type === 'equation' ? { latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' } :
               type === 'drawing' ? { strokes: [], width: 400, height: 300 } :
               'Enter Text',
    };
  
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    setBlocks(newBlocks);
    updateFile(newBlocks);
  };

  const updateBlock = (id, newContent, newType = null) => {
    const newBlocks = blocks.map(block => {
      if (block.id === id) {
        if (newType && newType !== block.type) {
          return { 
            ...block, 
            type: newType,
            content: newType === 'list' ? { heading: 'List Heading', items: [{ text: 'Item 1', sublists: [], images: [], videos: [] }] } : 
                     newType === 'image' ? { images: [] } :
                     newType === 'video' ? { videos: [] } :
                     newType === 'heading' ? { text: 'Heading', fontSize: 24, color: '#000000' } :
                     newType === 'equation' ? { latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' } :
                     newType === 'drawing' ? { strokes: [], width: 400, height: 300 } :
                     'Enter Text'
          };
        }
        return { 
          ...block, 
          content: newContent,
          type: newType || block.type
        };
      }
      return block;
    });
    setBlocks(newBlocks);
    updateFile(newBlocks);
  };

  const deleteBlock = (id) => {
    const newBlocks = blocks.filter(block => block.id !== id);
    setBlocks(newBlocks);
    updateFile(newBlocks);
  };

  const moveBlock = (id, direction) => {
    const index = blocks.findIndex(block => block.id === id);
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === blocks.length - 1)) {
      return;
    }

    const newBlocks = [...blocks];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    setBlocks(newBlocks);
    updateFile(newBlocks);
  };

  const handleBlockDoubleClick = (id) => {
    if (mode === MODES.VIEW) {
      setEditingBlockId(id);
    }
  };

  const finishEditing = () => {
    setEditingBlockId(null);
  };

  const toggleBlockSelection = (id) => {
    if (mode === MODES.SELECT) {
      setSelectedBlocks(prev => 
        prev.includes(id) 
          ? prev.filter(blockId => blockId !== id) 
          : [...prev, id]
      );
    }
  };

  const moveSelectedBlocks = (direction) => {
    if (selectedBlocks.length === 0) return;
    
    const newBlocks = [...blocks];
    const selectedIndices = selectedBlocks.map(id => blocks.findIndex(b => b.id === id)).sort();
    
    if (direction === 'up' && selectedIndices[0] === 0) return;
    if (direction === 'down' && selectedIndices[selectedIndices.length - 1] === blocks.length - 1) return;
    
    const delta = direction === 'up' ? -1 : 1;
    
    selectedIndices.forEach(index => {
      const newIndex = index + delta;
      [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    });
    
    setBlocks(newBlocks);
    updateFile(newBlocks);
  };

  const deleteSelectedBlocks = () => {
    if (selectedBlocks.length === 0) return;
    const newBlocks = blocks.filter(block => !selectedBlocks.includes(block.id));
    setBlocks(newBlocks);
    setSelectedBlocks([]);
    updateFile(newBlocks);
  };

  const prepareMoveOptions = () => {
    // Get all files in the current folder
    const getFilesInCurrentFolder = (folders, pathIndex = 0) => {
      if (pathIndex >= currentPath.length) {
        return folders.flatMap(folder => [
          ...folder.files.filter(file => file.id !== selectedFile.id),
          ...getFilesInCurrentFolder(folder.folders, pathIndex + 1)
        ]);
      }
      
      const currentFolder = folders.find(f => f.id === currentPath[pathIndex]);
      if (!currentFolder) return [];
      
      if (pathIndex === currentPath.length - 1) {
        return currentFolder.files.filter(file => file.id !== selectedFile.id);
      }
      
      return getFilesInCurrentFolder(currentFolder.folders, pathIndex + 1);
    };

    const files = getFilesInCurrentFolder(folders);
    setAvailableFiles(files);
    setShowMoveDialog(true);
  };

  const exportFileAsJson = () => {
    if (!selectedFile) return;
    
    const data = {
      ...selectedFile,
      exportedAt: new Date().toISOString(),
      editorVersion: '2.0', // Version identifier for content structure
      contentStructure: {
        supportsNestedSublists: true,
        supportsFormattedText: true,
        supportsEquations: true,
        supportsDrawings: true,
        supportsStyledHeadings: true
      }
    };
    
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedFile.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportFolderAsJson = () => {
    // Find the current folder
    const getCurrentFolder = (folders, pathIndex = 0) => {
      if (pathIndex >= currentPath.length) {
        return {
          id: 'root',
          name: 'Root Folder',
          folders,
          files: []
        };
      }
      
      const currentFolder = folders.find(f => f.id === currentPath[pathIndex]);
      if (!currentFolder) return null;
      
      if (pathIndex === currentPath.length - 1) {
        return currentFolder;
      }
      
      return getCurrentFolder(currentFolder.folders, pathIndex + 1);
    };
    
    const currentFolder = getCurrentFolder(folders);
    if (!currentFolder) return;
    
    const data = {
      ...currentFolder,
      exportedAt: new Date().toISOString(),
      editorVersion: '2.0', // Version identifier for content structure
      contentStructure: {
        supportsNestedSublists: true,
        supportsFormattedText: true,
        supportsEquations: true,
        supportsDrawings: true,
        supportsStyledHeadings: true
      }
    };
    
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentFolder.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_folder.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Content migration function to handle old formats
  const migrateBlockContent = (block) => {
    if (!block || !block.type) return { block, migrated: false };
    
    let migrated = false;
    let migratedBlock = { ...block };
    
    // Migrate old paragraph format to new string format
    if (block.type === 'paragraph' && typeof block.content === 'object' && block.content.text) {
      migratedBlock.content = block.content.text;
      migrated = true;
    }
    
    // Migrate old heading format if it's just a string
    if (block.type === 'heading' && typeof block.content === 'string') {
      migratedBlock.content = {
        text: block.content,
        fontSize: 24,
        color: '#000000'
      };
      migrated = true;
    }
    
    // Migrate old or corrupted list format
    if (block.type === 'list') {
      // If it's corrupted (has numeric keys) or is a string, reset it
      if (typeof block.content === 'string' || 
          (typeof block.content === 'object' && block.content && '0' in block.content)) {
        migratedBlock.content = {
          heading: 'List Heading',
          items: [{ text: 'Item 1', sublists: [], images: [], videos: [] }]
        };
        migrated = true;
      }
      // If it's an array (old format), convert it
      else if (Array.isArray(block.content)) {
        migratedBlock.content = {
          heading: 'List',
          items: block.content.map(item => 
            typeof item === 'string' 
              ? { text: item, sublists: [], images: [], videos: [] }
              : item
          )
        };
        migrated = true;
      }
      // If it's an object but missing proper structure, fix it
      else if (typeof block.content === 'object' && block.content) {
        const needsFixing = !block.content.items || !Array.isArray(block.content.items) ||
                           block.content.items.some(item => typeof item === 'string');
        
        if (needsFixing) {
          migratedBlock.content = {
            heading: block.content.heading || 'List Heading',
            items: Array.isArray(block.content.items) 
              ? block.content.items.map(item => 
                  typeof item === 'string' 
                    ? { text: item, sublists: [], images: [], videos: [] }
                    : {
                        text: item.text || '',
                        sublists: item.sublists || [],
                        images: item.images || [],
                        videos: item.videos || []
                      }
                )
              : [{ text: 'Item 1', sublists: [], images: [], videos: [] }]
          };
          migrated = true;
        }
      }
    }
    
    // Ensure equation blocks have proper structure
    if (block.type === 'equation' && typeof block.content === 'string') {
      migratedBlock.content = {
        latex: block.content
      };
      migrated = true;
    }
    
    // Ensure drawing blocks have proper structure
    if (block.type === 'drawing' && (!block.content || typeof block.content !== 'object')) {
      migratedBlock.content = {
        strokes: [],
        width: 400,
        height: 300
      };
      migrated = true;
    }
    
    return { block: migratedBlock, migrated };
  };

  const importJson = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        let migrationCount = 0;
        
        // Determine if it's a file or folder
        if (data.content !== undefined) {
          // It's a file - migrate content if needed
          let migratedContent = data.content;
          
          // If content is an array of blocks, migrate each block
          if (Array.isArray(data.content)) {
            migratedContent = data.content.map(block => {
              const result = migrateBlockContent(block);
              if (result.migrated) migrationCount++;
              return result.block;
            });
          }
          
          const newFile = {
            ...data,
            id: uuidv4(), // Generate new ID to avoid conflicts
            content: migratedContent,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          // Add to current folder
          const updateFolders = (folders, currentPathIndex = 0) => {
            return folders.map(folder => {
              if (currentPath.length > 0 && currentPath[currentPathIndex] === folder.id) {
                if (currentPathIndex < currentPath.length - 1) {
                  return {
                    ...folder,
                    folders: updateFolders(folder.folders, currentPathIndex + 1)
                  };
                }
                
                return {
                  ...folder,
                  files: [...folder.files, newFile]
                };
              }
              return {
                ...folder,
                folders: updateFolders(folder.folders, currentPathIndex)
              };
            });
          };
          
          setFolders(prevFolders => updateFolders(prevFolders));
          setSelectedFile(newFile);
          
          // Show migration feedback
          if (migrationCount > 0) {
            alert(`File imported successfully! ${migrationCount} blocks were automatically updated to the new format.`);
          } else {
            alert('File imported successfully!');
          }
        } else {
          // It's a folder - migrate all files in the folder
          const migrateFilesInFolder = (folderData) => {
            const migratedFolder = {
              ...folderData,
              files: (folderData.files || []).map(file => {
                if (Array.isArray(file.content)) {
                  const migratedBlocks = file.content.map(block => {
                    const result = migrateBlockContent(block);
                    if (result.migrated) migrationCount++;
                    return result.block;
                  });
                  return { ...file, content: migratedBlocks };
                }
                return file;
              }),
              folders: (folderData.folders || []).map(migrateFilesInFolder)
            };
            return migratedFolder;
          };
          
          const newFolder = {
            ...migrateFilesInFolder(data),
            id: uuidv4(), // Generate new ID to avoid conflicts
          };
          
          // Add to current folder
          const updateFolders = (folders, currentPathIndex = 0) => {
            return folders.map(folder => {
              if (currentPath.length > 0 && currentPath[currentPathIndex] === folder.id) {
                if (currentPathIndex < currentPath.length - 1) {
                  return {
                    ...folder,
                    folders: updateFolders(folder.folders, currentPathIndex + 1)
                  };
                }
                
                return {
                  ...folder,
                  folders: [...folder.folders, newFolder]
                };
              }
              return {
                ...folder,
                folders: updateFolders(folder.folders, currentPathIndex)
              };
            });
          };
          
          setFolders(prevFolders => updateFolders(prevFolders));
          setExpandedFolders(prev => ({ ...prev, [newFolder.id]: true }));
          
          // Show migration feedback
          if (migrationCount > 0) {
            alert(`Folder imported successfully! ${migrationCount} blocks were automatically updated to the new format.`);
          } else {
            alert('Folder imported successfully!');
          }
        }
      } catch (error) {
        console.error('Error parsing JSON:', error);
        alert('Invalid JSON file. Please make sure the file is a valid JSON export from this editor.');
      }
    };
    reader.readAsText(file);
  };

  const moveBlocksToNewFile = () => {
    if (!confirm('Are you sure you want to move selected blocks to a new file?')) return;
    
    if (selectedBlocks.length === 0) return;
    
    // Create new file with selected blocks
    const newFile = {
      id: uuidv4(),
      name: `New File from Selection (${new Date().toLocaleString()})`,
      content: blocks.filter(block => selectedBlocks.includes(block.id)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Remove blocks from current file
    const newBlocks = blocks.filter(block => !selectedBlocks.includes(block.id));
    
    // Update both files in folders state
    const updateFolders = (folders, currentPathIndex = 0) => {
      return folders.map(folder => {
        // Check if this folder contains the source file
        const sourceFileInFolder = folder.files.some(f => f.id === selectedFile.id);
        
        let updatedFiles = [...folder.files];
        let updatedFolders = [...folder.folders];
        
        // If this is the target folder (current folder)
        if (currentPath.length > 0 && currentPath[currentPathIndex] === folder.id) {
          if (currentPathIndex < currentPath.length - 1) {
            // Continue searching in subfolders
            updatedFolders = updateFolders(folder.folders, currentPathIndex + 1);
          } else {
            // We're in the target folder - add new file and update source file
            updatedFiles = [
              ...folder.files.map(file => 
                file.id === selectedFile.id 
                  ? { ...file, content: newBlocks, updatedAt: new Date().toISOString() }
                  : file
              ),
              newFile
            ];
          }
        } 
        // If not the target folder, but contains source file
        else if (sourceFileInFolder) {
          updatedFiles = updatedFiles.map(file => 
            file.id === selectedFile.id 
              ? { ...file, content: newBlocks, updatedAt: new Date().toISOString() }
              : file
          );
        }
        
        return {
          ...folder,
          files: updatedFiles,
          folders: updatedFolders
        };
      });
    };
  
    // Update state
    setFolders(prevFolders => {
      const updatedFolders = updateFolders(prevFolders);
      return updatedFolders;
    });
  
    setBlocks(newBlocks);
    setSelectedBlocks([]);
    setSelectedFile(newFile);
    setShowMoveDialog(false);
  };
  
  const moveBlocksToExistingFile = () => {
    if (!targetFileId) return;
    if (!confirm('Are you sure you want to move selected blocks to the selected file?')) return;
    
    const targetFile = availableFiles.find(f => f.id === targetFileId);
    if (!targetFile) return;
    
    // Get blocks to move
    const blocksToMove = blocks.filter(block => selectedBlocks.includes(block.id));
    
    // Update target file with moved blocks
    const updatedTargetFile = {
      ...targetFile,
      content: [...targetFile.content, ...blocksToMove],
      updatedAt: new Date().toISOString()
    };
    
    // Remove blocks from current file
    const newBlocks = blocks.filter(block => !selectedBlocks.includes(block.id));
    
    // Update both files in folders state
    const updateFolders = (folders) => {
      return folders.map(folder => {
        // Check if this folder contains the source file
        const sourceFileInFolder = folder.files.some(f => f.id === selectedFile.id);
        // Check if this folder contains the target file
        const targetFileInFolder = folder.files.some(f => f.id === targetFileId);
        
        let updatedFiles = [...folder.files];
        
        if (sourceFileInFolder) {
          updatedFiles = updatedFiles.map(file => 
            file.id === selectedFile.id 
              ? { ...file, content: newBlocks, updatedAt: new Date().toISOString() }
              : file
          );
        }
        
        if (targetFileInFolder) {
          updatedFiles = updatedFiles.map(file => 
            file.id === targetFileId ? updatedTargetFile : file
          );
        }
        
        return {
          ...folder,
          files: updatedFiles,
          folders: updateFolders(folder.folders)
        };
      });
    };
  
    // Update state
    setFolders(prevFolders => {
      const updatedFolders = updateFolders(prevFolders);
      return updatedFolders;
    });
  
    setBlocks(newBlocks);
    setSelectedBlocks([]);
    setShowMoveDialog(false);
    
    // Update selected file reference if needed
    if (selectedFile.id === targetFileId) {
      setSelectedFile(updatedTargetFile);
    }
  };

  const handleDrop = (draggedId, targetId) => {
    if (draggedId === targetId) return;
    
    const draggedIndex = blocks.findIndex(b => b.id === draggedId);
    const targetIndex = blocks.findIndex(b => b.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    const newBlocks = [...blocks];
    const [removed] = newBlocks.splice(draggedIndex, 1);
    newBlocks.splice(targetIndex, 0, removed);
    
    setBlocks(newBlocks);
    updateFile(newBlocks);
  };

  if (!selectedFile) {
    return (
      <div className="file-editor empty">
        <button onClick={exportFolderAsJson} className='gbtn' style={{right: '7px'}}>Export Folder</button>
            <label className="gbtn" style={{right: '130px',padding: '2px 12px'}}>
              Import JSON
              <input 
                type="file" 
                accept=".json" 
                onChange={importJson} 
                style={{ display: 'none' }} 
              />
            </label>
        <div className="empty-state">
          <h2>No file selected</h2>
          <p>Select a file from the sidebar or create a new one</p>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="file-editor">
        <div className="file-header">
          {isEditingName ? (
            <input
              type="text"
              value={fileName}
              onChange={handleNameChange}
              onBlur={saveNameChange}
              onKeyDown={(e) => e.key === 'Enter' && saveNameChange()}
              autoFocus
            />
          ) : (
            <h2 onClick={() => mode === MODES.EDIT && setIsEditingName(true)}>{fileName}</h2>
          )}
          <div className="file-meta">
            <span>Last updated: {new Date(selectedFile.updatedAt).toLocaleString()}</span>
            <div className="mode-controls">
              <button className={'mode-btn'} style={{right: '263px'}} onClick={()=>{setSelectedFile(null)}}>Clear</button>
              <button 
                className={`mode-btn ${mode === MODES.VIEW ? 'active' : ''}`}
                style={{right: '200px'}}
                onClick={() => {
                  setMode(MODES.VIEW);
                  setEditingBlockId(null);
                  setSelectedBlocks([]);
                }}
              >
                View
              </button>
              <button 
                className={`mode-btn ${mode === MODES.EDIT ? 'active' : ''}`}
                style={{right: '144px'}}
                onClick={() => {
                  setMode(MODES.EDIT);
                  setSelectedBlocks([]);
                }}
              >
                Edit
              </button>
              <button 
                className={`mode-btn ${mode === MODES.DRAG ? 'active' : ''}`}
                style={{right: '81px'}}
                onClick={() => {
                  setMode(MODES.DRAG);
                  setEditingBlockId(null);
                  setSelectedBlocks([]);
                }}
              >
                Drag
              </button>
              <button 
                className={`mode-btn ${mode === MODES.SELECT ? 'active' : ''}`}
                style={{right: '9px'}}
                onClick={() => {
                  setMode(MODES.SELECT);
                  setEditingBlockId(null);
                }}
              >
                Select
              </button>
            </div>
          </div>
          <div className="file-actions">
            <button onClick={exportFileAsJson}>Export File</button>
            <button onClick={exportFolderAsJson}>Export Folder</button>
            <label className="import-button">
              Import JSON
              <input 
                type="file" 
                accept=".json" 
                onChange={importJson} 
                style={{ display: 'none' }} 
              />
            </label>
          </div>
        </div>

        {mode === MODES.SELECT && selectedBlocks.length > 0 && (
          <div className="selection-actions">
            <button onClick={() => moveSelectedBlocks('up')}>Move Up</button>
            <button onClick={() => moveSelectedBlocks('down')}>Move Down</button>
            <button onClick={deleteSelectedBlocks}>Delete</button>
            <button onClick={prepareMoveOptions}>Move Blocks To...</button>
            <span>{selectedBlocks.length} blocks selected</span>
          </div>
        )}

{showMoveDialog && (
          <div className="move-dialog">
            <div className="move-dialog-content">
              <h3>Move {selectedBlocks.length} blocks to: </h3>
              <h5>**Select the folder needed in left sidebar**</h5>
              <div className="move-options">
                <button onClick={moveBlocksToNewFile}>
                  New File (in the Selected folder)
                </button>
                {availableFiles.length > 0 && (
                  <>
                    <div className="existing-files">
                      <h4>Existing Files:</h4>
                      <select 
                        value={targetFileId || ''}
                        onChange={(e) => setTargetFileId(e.target.value)}
                      >
                        <option value="">Select a file</option>
                        {availableFiles.map(file => (
                          <option key={file.id} value={file.id}>
                            {file.name}
                          </option>
                        ))}
                      </select>
                      <button 
                        onClick={moveBlocksToExistingFile}
                        disabled={!targetFileId}
                      >
                        Move to Selected File
                      </button>
                    </div>
                  </>
                )}
                {availableFiles.length === 0 && <div>No existing files other than this available in current selected folder</div>}
              </div>
              <button 
                className="cancel-move"
                onClick={() => setShowMoveDialog(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="blocks-container">
          {blocks.length === 0 && mode === MODES.EDIT && (
            <button 
              className="add-first-block"
              onClick={() => addBlock('paragraph', -1)}
            >
              + Add your first block
            </button>
          )}

          {blocks.map((block, index) => (
            <Block
              key={block.id}
              block={block}
              index={index}
              addBlock={addBlock}
              updateBlock={updateBlock}
              deleteBlock={deleteBlock}
              moveBlock={moveBlock}
              isFirst={index === 0}
              isLast={index === blocks.length - 1}
              editMode={mode === MODES.EDIT}
              isEditing={editingBlockId === block.id}
              isSelected={selectedBlocks.includes(block.id)}
              onDoubleClick={handleBlockDoubleClick}
              onFinishEditing={finishEditing}
              onSelect={toggleBlockSelection}
              onDrop={handleDrop}
              dragMode={mode === MODES.DRAG}
              selectMode={mode === MODES.SELECT}
            />
          ))}
        </div>
      </div>
    </DndProvider>
  );
};

const Block = ({ 
  block, 
  index, 
  addBlock, 
  updateBlock, 
  deleteBlock, 
  moveBlock, 
  isFirst, 
  isLast, 
  editMode,
  isEditing,
  isSelected,
  onDoubleClick,
  onFinishEditing,
  onSelect,
  onDrop,
  dragMode,
  selectMode
}) => {
  const [content, setContent] = useState(() => {
    if (block.type === 'list') {
      // Handle various list content formats
      if (!block.content) {
        return { heading: 'List Heading', items: [{ text: 'Item 1', sublists: [], images: [], videos: [] }] };
      }
      
      // If it's a string or has numeric keys (corrupted), reset it
      if (typeof block.content === 'string' || (typeof block.content === 'object' && '0' in block.content)) {
        return { heading: 'List Heading', items: [{ text: 'Item 1', sublists: [], images: [], videos: [] }] };
      }
      
      // If it's an array (old format), convert it
      if (Array.isArray(block.content)) {
        return { 
          heading: 'List', 
          items: block.content.map(item => 
            typeof item === 'string' 
              ? { text: item, sublists: [], images: [], videos: [] }
              : item
          ) 
        };
      }
      
      // If it's a proper object, ensure it has the right structure
      if (typeof block.content === 'object') {
        return {
          heading: block.content.heading || 'List Heading',
          items: Array.isArray(block.content.items) 
            ? block.content.items.map(item => 
                typeof item === 'string' 
                  ? { text: item, sublists: [], images: [], videos: [] }
                  : {
                      text: item.text || '',
                      sublists: item.sublists || [],
                      images: item.images || [],
                      videos: item.videos || []
                    }
              )
            : [{ text: 'Item 1', sublists: [], images: [], videos: [] }]
        };
      }
      
      return { heading: 'List Heading', items: [{ text: 'Item 1', sublists: [], images: [], videos: [] }] };
    }
    
    if (block.type === 'image') {
      return block.content && typeof block.content === 'object' 
        ? block.content 
        : { images: [] };
    }
    if (block.type === 'video') {
      return block.content && typeof block.content === 'object' 
        ? block.content 
        : { videos: [] };
    }
    if (block.type === 'heading') {
      return block.content && typeof block.content === 'object' 
        ? block.content 
        : { text: block.content || 'Heading', fontSize: 24, color: '#000000' };
    }
    if (block.type === 'equation') {
      return block.content && typeof block.content === 'object' 
        ? block.content 
        : { latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' };
    }
    if (block.type === 'drawing') {
      return block.content && typeof block.content === 'object' 
        ? block.content 
        : { strokes: [], width: 400, height: 300 };
    }
    // For paragraph and other simple text types
    return block.content || '';
  });

  const ref = useRef(null);

  const dragRef = useRef(null);

  const [{ isDragging }, drag, preview] = useDrag({
    type: ItemTypes.BLOCK,
    item: { id: block.id },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    canDrag: () => dragMode,
    previewOptions: {
      captureDraggingState: true,
    },
  });

  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.BLOCK,
    drop: (item) => onDrop(item.id, block.id),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
    canDrop: () => dragMode,
  });

  // Use separate refs for drag handle and drop target
  drag(dragRef);
  drop(ref);

  drag(drop(ref));

  const handleContentChange = (e) => {
    const newText = e.target.value;
    if (block.type === 'heading') {
      const newContent = { 
        ...(content || {}), 
        text: newText 
      };
      setContent(newContent);
      updateBlock(block.id, newContent);
    } else if (block.type === 'paragraph') {
      const newContent = { 
        ...(content || {}), 
        text: newText 
      };
      setContent(newContent);
      updateBlock(block.id, newContent);
    } else {
      setContent(newText);
      updateBlock(block.id, newText);
    }
  };

  const handleHeadingStyleChange = (field, value) => {
    const newContent = { 
      ...(content || {}), 
      [field]: value 
    };
    setContent(newContent);
    updateBlock(block.id, newContent);
  };

  const handleListHeadingChange = (e) => {
    const safeContent = content && typeof content === 'object' && !Array.isArray(content)
      ? content 
      : { heading: 'List Heading', items: [] };
      
    const newContent = { 
      ...safeContent,
      heading: e.target.value 
    };
    setContent(newContent);
    updateBlock(block.id, newContent);
  };

  const handleListChange = (listIndex, value) => {
    const safeContent = content && typeof content === 'object' && !Array.isArray(content)
      ? content 
      : { heading: 'List Heading', items: [] };
      
    const newItems = [...(safeContent.items || [])];
    
    // Ensure the item exists and has proper structure
    if (!newItems[listIndex]) {
      newItems[listIndex] = { text: '', sublists: [], images: [], videos: [] };
    }
    
    newItems[listIndex] = { 
      ...newItems[listIndex], 
      text: value 
    };
    
    const newContent = { 
      ...safeContent, 
      items: newItems 
    };
    setContent(newContent);
    updateBlock(block.id, newContent);
  };

  const addListItem = () => {
    const safeContent = content && typeof content === 'object' && !Array.isArray(content)
      ? content 
      : { heading: 'List Heading', items: [] };
      
    const newItems = [...(safeContent.items || []), { text: 'New item', sublists: [], images: [], videos: [] }];
    const newContent = { 
      ...safeContent, 
      items: newItems 
    };
    setContent(newContent);
    updateBlock(block.id, newContent);
  };

  const removeListItem = (listIndex) => {
    const safeContent = content && typeof content === 'object' && !Array.isArray(content)
      ? content 
      : { heading: 'List Heading', items: [] };
      
    const currentItems = safeContent.items || [];
    if (currentItems.length <= 1) {
      deleteBlock(block.id);
      return;
    }
    const newItems = currentItems.filter((_, i) => i !== listIndex);
    const newContent = { 
      ...safeContent, 
      items: newItems 
    };
    setContent(newContent);
    updateBlock(block.id, newContent);
  };

  const addSublist = (listIndex) => {
    const safeContent = content && typeof content === 'object' && !Array.isArray(content)
      ? content 
      : { heading: 'List Heading', items: [] };
      
    const newItems = [...(safeContent.items || [])];
    
    // Ensure the item exists and has proper structure
    if (!newItems[listIndex]) {
      newItems[listIndex] = { text: '', sublists: [], images: [], videos: [] };
    }
    
    newItems[listIndex] = {
      ...newItems[listIndex],
      sublists: [...(newItems[listIndex].sublists || []), { text: 'Subitem', sublists: [], images: [], videos: [] }]
    };
    const newContent = { 
      ...safeContent, 
      items: newItems 
    };
    setContent(newContent);
    updateBlock(block.id, newContent);
  };

  const updateSublist = (listIndex, subIndex, value) => {
    const safeContent = content && typeof content === 'object' && !Array.isArray(content)
      ? content 
      : { heading: 'List Heading', items: [] };
      
    const newItems = [...(safeContent.items || [])];
    
    // Ensure proper structure exists
    if (!newItems[listIndex]) {
      newItems[listIndex] = { text: '', sublists: [], images: [], videos: [] };
    }
    if (!newItems[listIndex].sublists) {
      newItems[listIndex].sublists = [];
    }
    if (!newItems[listIndex].sublists[subIndex]) {
      newItems[listIndex].sublists[subIndex] = { text: '', sublists: [], images: [], videos: [] };
    }
    
    newItems[listIndex].sublists[subIndex] = { 
      ...newItems[listIndex].sublists[subIndex], 
      text: value 
    };
    const newContent = { 
      ...safeContent, 
      items: newItems 
    };
    setContent(newContent);
    updateBlock(block.id, newContent);
  };

  const removeSublist = (listIndex, subIndex) => {
    const safeContent = content && typeof content === 'object' && !Array.isArray(content)
      ? content 
      : { heading: 'List Heading', items: [] };
      
    const newItems = [...(safeContent.items || [])];
    if (newItems[listIndex] && newItems[listIndex].sublists) {
      newItems[listIndex].sublists = newItems[listIndex].sublists.filter((_, i) => i !== subIndex);
    }
    const newContent = { 
      ...safeContent, 
      items: newItems 
    };
    setContent(newContent);
    updateBlock(block.id, newContent);
  };

  const addSublistToSublist = (listIndex, subIndex, text = 'Sub-subitem') => {
    const newItems = [...(content?.items || [])];
    if (!newItems[listIndex].sublists[subIndex].sublists) {
      newItems[listIndex].sublists[subIndex].sublists = [];
    }
    newItems[listIndex].sublists[subIndex].sublists.push({ 
      text, 
      sublists: [], 
      images: [], 
      videos: [] 
    });
    const newContent = { 
      ...(content || {}), 
      items: newItems 
    };
    setContent(newContent);
    updateBlock(block.id, newContent);
  };

  const updateSubSublist = (listIndex, subIndex, subSubIndex, value) => {
    const newItems = [...(content?.items || [])];
    newItems[listIndex].sublists[subIndex].sublists[subSubIndex] = {
      ...newItems[listIndex].sublists[subIndex].sublists[subSubIndex],
      text: value
    };
    const newContent = { 
      ...(content || {}), 
      items: newItems 
    };
    setContent(newContent);
    updateBlock(block.id, newContent);
  };

  const addNestedSublist = (listIndex, subIndex, depth, text = 'Sub-subitem') => {
    const safeContent = content && typeof content === 'object' && !Array.isArray(content)
      ? content 
      : { heading: 'List Heading', items: [] };
      
    const newItems = [...(safeContent.items || [])];
    
    // Navigate to the correct nested level
    let currentItem = newItems[listIndex];
    if (!currentItem) {
      currentItem = { text: '', sublists: [], images: [], videos: [] };
      newItems[listIndex] = currentItem;
    }
    
    // Navigate through the subIndex array to find the right sublist
    for (let i = 0; i < subIndex.length; i++) {
      if (!currentItem.sublists) currentItem.sublists = [];
      if (!currentItem.sublists[subIndex[i]]) {
        currentItem.sublists[subIndex[i]] = { text: '', sublists: [], images: [], videos: [] };
      }
      currentItem = currentItem.sublists[subIndex[i]];
    }
    
    if (!currentItem.sublists) {
      currentItem.sublists = [];
    }
    
    currentItem.sublists.push({ 
      text, 
      sublists: [], 
      images: [], 
      videos: [] 
    });
    
    const newContent = { 
      ...safeContent, 
      items: newItems 
    };
    setContent(newContent);
    updateBlock(block.id, newContent);
  };

  const updateNestedSublist = (listIndex, subIndex, depth, value) => {
    const safeContent = content && typeof content === 'object' && !Array.isArray(content)
      ? content 
      : { heading: 'List Heading', items: [] };
      
    const newItems = [...(safeContent.items || [])];
    
    // Navigate to the correct nested level
    let currentItem = newItems[listIndex];
    if (!currentItem) return;
    
    // Navigate through the subIndex array to find the right sublist
    for (let i = 0; i < subIndex.length - 1; i++) {
      if (!currentItem.sublists || !currentItem.sublists[subIndex[i]]) return;
      currentItem = currentItem.sublists[subIndex[i]];
    }
    
    if (currentItem.sublists && currentItem.sublists[subIndex[subIndex.length - 1]]) {
      currentItem.sublists[subIndex[subIndex.length - 1]].text = value;
    }
    
    const newContent = { 
      ...safeContent, 
      items: newItems 
    };
    setContent(newContent);
    updateBlock(block.id, newContent);
  };

  const removeNestedSublist = (listIndex, subIndex, depth) => {
    const safeContent = content && typeof content === 'object' && !Array.isArray(content)
      ? content 
      : { heading: 'List Heading', items: [] };
      
    const newItems = [...(safeContent.items || [])];
    
    // Navigate to the correct nested level
    let currentItem = newItems[listIndex];
    if (!currentItem) return;
    
    // Navigate through the subIndex array to find the parent of the item to remove
    for (let i = 0; i < subIndex.length - 1; i++) {
      if (!currentItem.sublists || !currentItem.sublists[subIndex[i]]) return;
      currentItem = currentItem.sublists[subIndex[i]];
    }
    
    if (currentItem.sublists) {
      currentItem.sublists = currentItem.sublists.filter((_, i) => i !== subIndex[subIndex.length - 1]);
    }
    
    const newContent = { 
      ...safeContent, 
      items: newItems 
    };
    setContent(newContent);
    updateBlock(block.id, newContent);
  };

  // Recursive function to render sublists
  const renderSublist = (sublist, depth = 0) => {
    const bulletStyle = depth === 0 ? '◦' : depth === 1 ? '▪' : '▫';
    const marginLeft = `${depth * 0.01 - 1}rem`; // Linear spacing: 0, 1.2rem, 2.4rem, 3.6rem...
    
    return (
      <div key={sublist.id || Math.random()} className="sublist-container" style={{ marginLeft }}>
        <div className="sublist-item-display">
          {bulletStyle} {sublist.text || ''}
        </div>
        
        {/* Recursively render nested sublists */}
        {sublist.sublists && sublist.sublists.length > 0 && (
          <div className="nested-sublists-display">
            {sublist.sublists.map((nestedSublist, k) => 
              renderSublist(nestedSublist, depth + 1)
            )}
          </div>
        )}
        
        {/* Images */}
        {sublist.images && sublist.images.length > 0 && (
          <div className="item-images-display">
            {sublist.images.map((img, j) => (
              <img key={j} src={img.url} alt="" style={{ width: img.width, height: img.height, margin: '5px' }} />
            ))}
          </div>
        )}
        
        {/* Videos */}
        {sublist.videos && sublist.videos.length > 0 && (
          <div className="item-videos-display">
            {sublist.videos.map((vid, j) => (
              <iframe 
                key={j} 
                src={vid.url} 
                width={vid.width} 
                height={vid.height}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={`Video ${j + 1}`}
                style={{ margin: '5px' }}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Recursive function to render editable sublists
  const renderEditableSublist = (sublist, listIndex, subIndex, depth = 0) => {
    const marginLeft = `${depth * 0.1}rem`; // Linear spacing: 0, 1.2rem, 2.4rem, 3.6rem...
    
    return (
      <div key={`${listIndex}-${subIndex}-${depth}`} className="sublist-container" style={{ marginLeft }}>
        <div className="sublist-item">
          <input
            type="text"
            value={sublist.text || ''}
            onChange={(e) => updateNestedSublist(listIndex, subIndex, depth, e.target.value)}
            placeholder="Subitem"
          />
          <button onClick={() => removeNestedSublist(listIndex, subIndex, depth)}>×</button>
          <button onClick={() => addNestedSublist(listIndex, subIndex, depth)}>+ Sub</button>
        </div>
        
        {/* Recursively render nested sublists */}
        {sublist.sublists && sublist.sublists.length > 0 && (
          <div className="nested-sublists">
            {sublist.sublists.map((nestedSublist, k) => 
              renderEditableSublist(nestedSublist, listIndex, [...subIndex, k], depth + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  const addImageToItem = (listIndex, imageUrl, width = 200, height = 200) => {
    const newItems = [...(content?.items || [])];
    newItems[listIndex] = {
      ...newItems[listIndex],
      images: [...(newItems[listIndex].images || []), { url: imageUrl, width, height }]
    };
    const newContent = { 
      ...(content || {}), 
      items: newItems 
    };
    setContent(newContent);
    updateBlock(block.id, newContent);
  };

  const updateImageInItem = (listIndex, imageIndex, field, value) => {
    const newItems = [...(content?.items || [])];
    newItems[listIndex].images[imageIndex] = {
      ...newItems[listIndex].images[imageIndex],
      [field]: value
    };
    const newContent = { 
      ...(content || {}), 
      items: newItems 
    };
    setContent(newContent);
    updateBlock(block.id, newContent);
  };

  const removeImageFromItem = (listIndex, imageIndex) => {
    const newItems = [...(content?.items || [])];
    newItems[listIndex].images = newItems[listIndex].images.filter((_, i) => i !== imageIndex);
    const newContent = { 
      ...(content || {}), 
      items: newItems 
    };
    setContent(newContent);
    updateBlock(block.id, newContent);
  };

  const addVideoToItem = (listIndex, videoUrl, width = 560, height = 315) => {
    const embedUrl = convertToEmbedUrl(videoUrl);
    const newItems = [...(content?.items || [])];
    newItems[listIndex] = {
      ...newItems[listIndex],
      videos: [...(newItems[listIndex].videos || []), { url: embedUrl, originalUrl: videoUrl, width, height }]
    };
    const newContent = { 
      ...(content || {}), 
      items: newItems 
    };
    setContent(newContent);
    updateBlock(block.id, newContent);
  };

  const updateVideoInItem = (listIndex, videoIndex, field, value) => {
    const newItems = [...(content?.items || [])];
    if (field === 'url') {
      const embedUrl = convertToEmbedUrl(value);
      newItems[listIndex].videos[videoIndex] = {
        ...newItems[listIndex].videos[videoIndex],
        url: embedUrl,
        originalUrl: value
      };
    } else {
      newItems[listIndex].videos[videoIndex] = {
        ...newItems[listIndex].videos[videoIndex],
        [field]: value
      };
    }
    const newContent = { 
      ...(content || {}), 
      items: newItems 
    };
    setContent(newContent);
    updateBlock(block.id, newContent);
  };

  const removeVideoFromItem = (listIndex, videoIndex) => {
    const newItems = [...(content?.items || [])];
    newItems[listIndex].videos = newItems[listIndex].videos.filter((_, i) => i !== videoIndex);
    const newContent = { 
      ...(content || {}), 
      items: newItems 
    };
    setContent(newContent);
    updateBlock(block.id, newContent);
  };

  // Image block functions
  const addImage = (imageUrl, width = 200, height = 200) => {
    const newContent = {
      ...(content || {}),
      images: [...(content?.images || []), { url: imageUrl, width, height }]
    };
    setContent(newContent);
    updateBlock(block.id, newContent);
  };

  const updateImage = (imageIndex, field, value) => {
    const newImages = [...(content?.images || [])];
    newImages[imageIndex] = {
      ...newImages[imageIndex],
      [field]: value
    };
    const newContent = { 
      ...(content || {}), 
      images: newImages 
    };
    setContent(newContent);
    updateBlock(block.id, newContent);
  };

  const removeImage = (imageIndex) => {
    const newImages = (content?.images || []).filter((_, i) => i !== imageIndex);
    const newContent = { 
      ...(content || {}), 
      images: newImages 
    };
    setContent(newContent);
    updateBlock(block.id, newContent);
  };

  // Helper function to convert YouTube URL to embed URL
  const convertToEmbedUrl = (url) => {
    if (!url) return url;
    
    // YouTube URL patterns
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(youtubeRegex);
    
    if (match) {
      const videoId = match[1];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    
    // Vimeo URL patterns
    const vimeoRegex = /(?:vimeo\.com\/)([0-9]+)/;
    const vimeoMatch = url.match(vimeoRegex);
    
    if (vimeoMatch) {
      const videoId = vimeoMatch[1];
      return `https://player.vimeo.com/video/${videoId}`;
    }
    
    // If it's already an embed URL or other format, return as is
    return url;
  };

  // Video block functions
  const addVideo = (videoUrl, width = 560, height = 315) => {
    const embedUrl = convertToEmbedUrl(videoUrl);
    const newContent = {
      ...(content || {}),
      videos: [...(content?.videos || []), { url: embedUrl, originalUrl: videoUrl, width, height }]
    };
    setContent(newContent);
    updateBlock(block.id, newContent);
  };

  const updateVideo = (videoIndex, field, value) => {
    const newVideos = [...(content?.videos || [])];
    if (field === 'url') {
      const embedUrl = convertToEmbedUrl(value);
      newVideos[videoIndex] = {
        ...newVideos[videoIndex],
        url: embedUrl,
        originalUrl: value
      };
    } else {
      newVideos[videoIndex] = {
        ...newVideos[videoIndex],
        [field]: value
      };
    }
    const newContent = { 
      ...(content || {}), 
      videos: newVideos 
    };
    setContent(newContent);
    updateBlock(block.id, newContent);
  };

  const removeVideo = (videoIndex) => {
    const newVideos = (content?.videos || []).filter((_, i) => i !== videoIndex);
    const newContent = { 
      ...(content || {}), 
      videos: newVideos 
    };
    setContent(newContent);
    updateBlock(block.id, newContent);
  };

  const handleTypeChange = (e) => {
    const newType = e.target.value;
    updateBlock(block.id, null, newType);
  };

  const renderBlockContent = () => {
    switch (block.type) {
      case 'heading':
        const safeHeadingContent = content && typeof content === 'object' 
          ? content 
          : { text: content || 'Heading', fontSize: 24, color: '#000000' };
          
        return isEditing ? (
          <div className="editing-block">
            <select
              value={block.type}
              onChange={handleTypeChange}
            >
              <option value="paragraph">Paragraph</option>
              <option value="heading">Heading</option>
              <option value="list">List</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="equation">Equation</option>
              <option value="drawing">Drawing</option>
            </select><br/>
            <div className="heading-controls">
              <input
                type="text"
                value={safeHeadingContent.text || ''}
                onChange={(e) => handleHeadingStyleChange('text', e.target.value)}
                className="block-heading-input"
                placeholder="Heading"
                autoFocus
              />
              <div className="style-controls">
                <label>Size: 
                  <input
                    type="number"
                    value={safeHeadingContent.fontSize || 24}
                    onChange={(e) => handleHeadingStyleChange('fontSize', parseInt(e.target.value))}
                    min="12"
                    max="72"
                  />
                </label>
                <label>Color: 
                  <input
                    type="color"
                    value={safeHeadingContent.color || '#000000'}
                    onChange={(e) => handleHeadingStyleChange('color', e.target.value)}
                  />
                </label>
              </div>
            </div>
            <button 
              className="add-block-below"
              onClick={() => addBlock('paragraph', index)}
            >
              +
            </button>
            <button onClick={onFinishEditing}>Done</button>
          </div>
        ) : editMode ? (
          <div className="heading-controls">
            <input
              type="text"
              value={safeHeadingContent.text || ''}
              onChange={(e) => handleHeadingStyleChange('text', e.target.value)}
              className="block-heading-input"
              placeholder="Heading"
            />
            <div className="style-controls">
              <label>Size: 
                <input
                  type="number"
                  value={safeHeadingContent.fontSize || 24}
                  onChange={(e) => handleHeadingStyleChange('fontSize', parseInt(e.target.value))}
                  min="12"
                  max="72"
                />
              </label>
              <label>Color: 
                <input
                  type="color"
                  value={safeHeadingContent.color || '#000000'}
                  onChange={(e) => handleHeadingStyleChange('color', e.target.value)}
                />
              </label>
            </div>
          </div>
        ) : (
          <h3 
            className={`block-heading-display ${isSelected ? 'selected' : ''}`}
            style={{ 
              fontSize: safeHeadingContent.fontSize + 'px', 
              color: safeHeadingContent.color 
            }}
            onDoubleClick={() => onDoubleClick(block.id)}
            onClick={() => onSelect(block.id)}
          >
            {safeHeadingContent.text || ''}
          </h3>
        );
      case 'paragraph':
        const safeParagraphContent = typeof content === 'string' 
          ? content 
          : (content && content.text) || 'Enter Text';
          
        return isEditing ? (
          <div className="editing-block">
            <select
              value={block.type}
              onChange={handleTypeChange}
            >
              <option value="paragraph">Paragraph</option>
              <option value="heading">Heading</option>
              <option value="list">List</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="equation">Equation</option>
              <option value="drawing">Drawing</option>
            </select><br/>
            <div className="paragraph-controls">
              <textarea
                value={safeParagraphContent}
                onChange={(e) => {
                  setContent(e.target.value);
                  updateBlock(block.id, e.target.value);
                }}
                className="block-paragraph"
                placeholder="Type something... Use <b>bold</b>, <i>italic</i>, <c=red>colored text</c>, <link>url</link>"
                autoFocus
              />
              <div className="formatting-help">
                <small>
                  Formatting: &lt;b&gt;bold&lt;/b&gt;, &lt;i&gt;italic&lt;/i&gt;, &lt;c=red&gt;color&lt;/c&gt;, &lt;link&gt;url&lt;/link&gt;
                </small>
              </div>
            </div>
            <button 
              className="add-block-below"
              onClick={() => addBlock('paragraph', index)}
            >
              +
            </button>
            <button onClick={onFinishEditing}>Done</button>
          </div>
        ) : editMode ? (
          <div className="paragraph-controls">
            <textarea
              value={safeParagraphContent}
              onChange={(e) => {
                setContent(e.target.value);
                updateBlock(block.id, e.target.value);
              }}
              className="block-paragraph"
              placeholder="Type something... Use <b>bold</b>, <i>italic</i>, <c=red>colored text</c>, <link>url</link>"
            />
            <div className="formatting-help">
              <small>
                Formatting: &lt;b&gt;bold&lt;/b&gt;, &lt;i&gt;italic&lt;/i&gt;, &lt;c=red&gt;color&lt;/c&gt;, &lt;link&gt;url&lt;/link&gt;
              </small>
            </div>
          </div>
        ) : (
          <p 
            className={`block-paragraph-display ${isSelected ? 'selected' : ''}`}
            onDoubleClick={() => onDoubleClick(block.id)}
            onClick={() => onSelect(block.id)}
          >
            {parseContent(safeParagraphContent)}
          </p>
        );
      case 'list':
        // Ensure proper content structure for lists
        const safeContent = (() => {
          if (!content) {
            return { heading: 'List Heading', items: [{ text: 'Item 1', sublists: [], images: [], videos: [] }] };
          }
          
          // If content is a string or array (old format), convert it
          if (typeof content === 'string' || Array.isArray(content)) {
            return { 
              heading: 'List Heading', 
              items: Array.isArray(content) 
                ? content.map(item => 
                    typeof item === 'string' 
                      ? { text: item, sublists: [], images: [], videos: [] }
                      : item
                  )
                : [{ text: 'Item 1', sublists: [], images: [], videos: [] }]
            };
          }
          
          // If content is an object but missing structure, fix it
          if (typeof content === 'object') {
            return {
              heading: content.heading || 'List Heading',
              items: Array.isArray(content.items) 
                ? content.items.map(item => 
                    typeof item === 'string' 
                      ? { text: item, sublists: [], images: [], videos: [] }
                      : {
                          text: item.text || '',
                          sublists: item.sublists || [],
                          images: item.images || [],
                          videos: item.videos || []
                        }
                  )
                : [{ text: 'Item 1', sublists: [], images: [], videos: [] }]
            };
          }
          
          return { heading: 'List Heading', items: [{ text: 'Item 1', sublists: [], images: [], videos: [] }] };
        })();
        
        const safeItems = safeContent.items || [];
        
        return isEditing ? (
          <div className="editing-block">
            <select
              value={block.type}
              onChange={handleTypeChange}
            >
              <option value="paragraph">Paragraph</option>
              <option value="heading">Heading</option>
              <option value="list">List</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="equation">Equation</option>
              <option value="drawing">Drawing</option>
            </select><br/>
            <input
              type="text"
              value={safeContent.heading || ''}
              onChange={handleListHeadingChange}
              className="list-heading-input"
              placeholder="List Heading"
              autoFocus
            />
            {safeItems.map((item, i) => (
              <div key={i} className="list-item-container">
                <div className="list-item">
                  <input
                    type="text"
                    value={item.text || ''}
                    onChange={(e) => handleListChange(i, e.target.value)}
                    placeholder="List item"
                  />
                  <button onClick={() => removeListItem(i)}>×</button>
                  <button onClick={() => addSublist(i)}>+ Sub</button>
                  <button onClick={() => addImageToItem(i, prompt('Enter image URL:') || '')}>+ Img</button>
                  <button onClick={() => addVideoToItem(i, prompt('Enter video URL:') || '')}>+ Vid</button>
                </div>
                
                {/* Sublists */}
                {item.sublists && item.sublists.length > 0 && (
                  <div className="sublists">
                    {item.sublists.map((subitem, j) => 
                      renderEditableSublist(subitem, i, [j], 0)
                    )}
                  </div>
                )}
                
                {/* Images */}
                {item.images && item.images.length > 0 && (
                  <div className="item-images">
                    {item.images.map((img, j) => (
                      <div key={j} className="image-container">
                        <img src={img.url} alt="" style={{ width: img.width, height: img.height }} />
                        <div className="image-controls">
                          <input
                            type="number"
                            value={img.width}
                            onChange={(e) => updateImageInItem(i, j, 'width', parseInt(e.target.value))}
                            placeholder="Width"
                          />
                          <input
                            type="number"
                            value={img.height}
                            onChange={(e) => updateImageInItem(i, j, 'height', parseInt(e.target.value))}
                            placeholder="Height"
                          />
                          <button onClick={() => removeImageFromItem(i, j)}>×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Videos */}
                {item.videos && item.videos.length > 0 && (
                  <div className="item-videos">
                    {item.videos.map((vid, j) => (
                      <div key={j} className="video-container">
                        <iframe 
                          src={vid.url} 
                          width={vid.width} 
                          height={vid.height}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title={`Video ${j + 1}`}
                        />
                        <div className="video-controls">
                          <input
                            type="text"
                            value={vid.originalUrl || vid.url}
                            onChange={(e) => updateVideoInItem(i, j, 'url', e.target.value)}
                            placeholder="Video URL"
                          />
                          <input
                            type="number"
                            value={vid.width}
                            onChange={(e) => updateVideoInItem(i, j, 'width', parseInt(e.target.value))}
                            placeholder="Width"
                          />
                          <input
                            type="number"
                            value={vid.height}
                            onChange={(e) => updateVideoInItem(i, j, 'height', parseInt(e.target.value))}
                            placeholder="Height"
                          />
                          <button onClick={() => removeVideoFromItem(i, j)}>×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="list-actions">
              <button onClick={addListItem}>+ Add item</button>
              <button 
                className="add-block-below"
                onClick={() => addBlock('paragraph', index)}
              >
                +
              </button>
              <button onClick={onFinishEditing}>Done</button>
            </div>
          </div>
        ) : editMode ? (
          <div className="block-list">
            <input
              type="text"
              value={safeContent.heading || ''}
              onChange={handleListHeadingChange}
              className="list-heading-input"
              placeholder="List Heading"
            />
            {safeItems.map((item, i) => (
              <div key={i} className="list-item-container" style={{ marginBottom: i !== safeItems.length - 1 ? '1rem' : '0rem' }}>
                <div className="list-item">
                  <input
                    type="text"
                    value={item.text || ''}
                    onChange={(e) => handleListChange(i, e.target.value)}
                    placeholder="List item"
                  />
                  <button onClick={() => removeListItem(i)}>×</button>
                  <button onClick={() => addSublist(i)}>+ Sub</button>
                  <button onClick={() => addImageToItem(i, prompt('Enter image URL:') || '')}>+ Img</button>
                  <button onClick={() => addVideoToItem(i, prompt('Enter video URL:') || '')}>+ Vid</button>
                </div>
                
                {/* Sublists */}
                {item.sublists && item.sublists.length > 0 && (
                  <div className="sublists">
                    {item.sublists.map((subitem, j) => 
                      renderEditableSublist(subitem, i, [j], 0)
                    )}
                  </div>
                )}
                
                {/* Images */}
                {item.images && item.images.length > 0 && (
                  <div className="item-images">
                    {item.images.map((img, j) => (
                      <div key={j} className="image-container">
                        <img src={img.url} alt="" style={{ width: img.width, height: img.height }} />
                        <div className="image-controls">
                          <input
                            type="number"
                            value={img.width}
                            onChange={(e) => updateImageInItem(i, j, 'width', parseInt(e.target.value))}
                            placeholder="Width"
                          />
                          <input
                            type="number"
                            value={img.height}
                            onChange={(e) => updateImageInItem(i, j, 'height', parseInt(e.target.value))}
                            placeholder="Height"
                          />
                          <button onClick={() => removeImageFromItem(i, j)}>×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Videos */}
                {item.videos && item.videos.length > 0 && (
                  <div className="item-videos">
                    {item.videos.map((vid, j) => (
                      <div key={j} className="video-container">
                        <iframe 
                          src={vid.url} 
                          width={vid.width} 
                          height={vid.height}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title={`Video ${j + 1}`}
                        />
                        <div className="video-controls">
                          <input
                            type="text"
                            value={vid.originalUrl || vid.url}
                            onChange={(e) => updateVideoInItem(i, j, 'url', e.target.value)}
                            placeholder="Video URL"
                          />
                          <input
                            type="number"
                            value={vid.width}
                            onChange={(e) => updateVideoInItem(i, j, 'width', parseInt(e.target.value))}
                            placeholder="Width"
                          />
                          <input
                            type="number"
                            value={vid.height}
                            onChange={(e) => updateVideoInItem(i, j, 'height', parseInt(e.target.value))}
                            placeholder="Height"
                          />
                          <button onClick={() => removeVideoFromItem(i, j)}>×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <button onClick={addListItem}>+ Add item</button>
          </div>
        ) : (
          <div 
            className={`block-list ${isSelected ? 'selected' : ''}`}
            onDoubleClick={() => onDoubleClick(block.id)}
            onClick={() => onSelect(block.id)}
          >
            <h4 className="list-heading-display">{safeContent.heading || 'List'}</h4>
            {safeItems.map((item, i) => (
              <div key={i} className="list-item-display-container">
                <div className="list-item-display">• {item.text || ''}</div>
                
                {/* Sublists */}
                {item.sublists && item.sublists.length > 0 && (
                  <div className="sublists-display">
                    {item.sublists.map((subitem, j) => 
                      renderSublist(subitem, 0)
                    )}
                  </div>
                )}
                
                {/* Images */}
                {item.images && item.images.length > 0 && (
                  <div className="item-images-display">
                    {item.images.map((img, j) => (
                      <img key={j} src={img.url} alt="" style={{ width: img.width, height: img.height, margin: '5px' }} />
                    ))}
                  </div>
                )}
                
                {/* Videos */}
                {item.videos && item.videos.length > 0 && (
                  <div className="item-videos-display">
                    {item.videos.map((vid, j) => (
                      <iframe 
                        key={j} 
                        src={vid.url} 
                        width={vid.width} 
                        height={vid.height}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={`Video ${j + 1}`}
                        style={{ margin: '5px' }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      case 'image':
        const safeImageContent = content && typeof content === 'object' 
          ? content 
          : { images: [] };
        
        return isEditing ? (
          <div className="editing-block">
            <select
              value={block.type}
              onChange={handleTypeChange}
            >
              <option value="paragraph">Paragraph</option>
              <option value="heading">Heading</option>
              <option value="list">List</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="equation">Equation</option>
              <option value="drawing">Drawing</option>
            </select><br/>
            <div className="image-block">
              {safeImageContent.images.map((img, i) => (
                <div key={i} className="image-container">
                  <img src={img.url} alt="" style={{ width: img.width, height: img.height }} />
                  <div className="image-controls">
                    <input
                      type="text"
                      value={img.url}
                      onChange={(e) => updateImage(i, 'url', e.target.value)}
                      placeholder="Image URL"
                    />
                    <input
                      type="number"
                      value={img.width}
                      onChange={(e) => updateImage(i, 'width', parseInt(e.target.value))}
                      placeholder="Width"
                    />
                    <input
                      type="number"
                      value={img.height}
                      onChange={(e) => updateImage(i, 'height', parseInt(e.target.value))}
                      placeholder="Height"
                    />
                    <button onClick={() => removeImage(i)}>×</button>
                  </div>
                </div>
              ))}
              <button onClick={() => addImage(prompt('Enter image URL:') || '')}>+ Add Image</button>
            </div>
            <button 
              className="add-block-below"
              onClick={() => addBlock('paragraph', index)}
            >
              +
            </button>
            <button onClick={onFinishEditing}>Done</button>
          </div>
        ) : editMode ? (
          <div className="image-block">
            {safeImageContent.images.map((img, i) => (
              <div key={i} className="image-container">
                <img src={img.url} alt="" style={{ width: img.width, height: img.height }} />
                <div className="image-controls">
                  <input
                    type="text"
                    value={img.url}
                    onChange={(e) => updateImage(i, 'url', e.target.value)}
                    placeholder="Image URL"
                  />
                  <input
                    type="number"
                    value={img.width}
                    onChange={(e) => updateImage(i, 'width', parseInt(e.target.value))}
                    placeholder="Width"
                  />
                  <input
                    type="number"
                    value={img.height}
                    onChange={(e) => updateImage(i, 'height', parseInt(e.target.value))}
                    placeholder="Height"
                  />
                  <button onClick={() => removeImage(i)}>×</button>
                </div>
              </div>
            ))}
            <button onClick={() => addImage(prompt('Enter image URL:') || '')}>+ Add Image</button>
          </div>
        ) : (
          <div 
            className={`image-block ${isSelected ? 'selected' : ''}`}
            onDoubleClick={() => onDoubleClick(block.id)}
            onClick={() => onSelect(block.id)}
          >
            {safeImageContent.images.map((img, i) => (
              <img key={i} src={img.url} alt="" style={{ width: img.width, height: img.height, margin: '5px' }} />
            ))}
          </div>
        );
      case 'video':
        const safeVideoContent = content && typeof content === 'object' 
          ? content 
          : { videos: [] };
        
        return isEditing ? (
          <div className="editing-block">
            <select
              value={block.type}
              onChange={handleTypeChange}
            >
              <option value="paragraph">Paragraph</option>
              <option value="heading">Heading</option>
              <option value="list">List</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="equation">Equation</option>
              <option value="drawing">Drawing</option>
            </select><br/>
            <div className="video-block">
              {safeVideoContent.videos.map((vid, i) => (
                <div key={i} className="video-container">
                  <iframe 
                    src={vid.url} 
                    width={vid.width} 
                    height={vid.height}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={`Video ${i + 1}`}
                  />
                  <div className="video-controls">
                    <input
                      type="text"
                      value={vid.originalUrl || vid.url}
                      onChange={(e) => updateVideo(i, 'url', e.target.value)}
                      placeholder="Video URL"
                    />
                    <input
                      type="number"
                      value={vid.width}
                      onChange={(e) => updateVideo(i, 'width', parseInt(e.target.value))}
                      placeholder="Width"
                    />
                    <input
                      type="number"
                      value={vid.height}
                      onChange={(e) => updateVideo(i, 'height', parseInt(e.target.value))}
                      placeholder="Height"
                    />
                    <button onClick={() => removeVideo(i)}>×</button>
                  </div>
                </div>
              ))}
              <button onClick={() => addVideo(prompt('Enter video URL:') || '')}>+ Add Video</button>
            </div>
            <button 
              className="add-block-below"
              onClick={() => addBlock('paragraph', index)}
            >
              +
            </button>
            <button onClick={onFinishEditing}>Done</button>
          </div>
        ) : editMode ? (
          <div className="video-block">
            {safeVideoContent.videos.map((vid, i) => (
              <div key={i} className="video-container">
                <iframe 
                  src={vid.url} 
                  width={vid.width} 
                  height={vid.height}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={`Video ${i + 1}`}
                />
                <div className="video-controls">
                  <input
                    type="text"
                    value={vid.originalUrl || vid.url}
                    onChange={(e) => updateVideo(i, 'url', e.target.value)}
                    placeholder="Video URL"
                  />
                  <input
                    type="number"
                    value={vid.width}
                    onChange={(e) => updateVideo(i, 'width', parseInt(e.target.value))}
                    placeholder="Width"
                  />
                  <input
                    type="number"
                    value={vid.height}
                    onChange={(e) => updateVideo(i, 'height', parseInt(e.target.value))}
                    placeholder="Height"
                  />
                  <button onClick={() => removeVideo(i)}>×</button>
                </div>
              </div>
            ))}
            <button onClick={() => addVideo(prompt('Enter video URL:') || '')}>+ Add Video</button>
          </div>
        ) : (
          <div 
            className={`video-block ${isSelected ? 'selected' : ''}`}
            onDoubleClick={() => onDoubleClick(block.id)}
            onClick={() => onSelect(block.id)}
          >
            {safeVideoContent.videos.map((vid, i) => (
              <iframe 
                key={i} 
                src={vid.url} 
                width={vid.width} 
                height={vid.height}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={`Video ${i + 1}`}
                style={{ margin: '5px' }}
              />
            ))}
          </div>
        );
      case 'equation':
        const safeEquationContent = content && typeof content === 'object' 
          ? content 
          : { latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' };
          
        return isEditing ? (
          <div className="editing-block">
            <select
              value={block.type}
              onChange={handleTypeChange}
            >
              <option value="paragraph">Paragraph</option>
              <option value="heading">Heading</option>
              <option value="list">List</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="equation">Equation</option>
              <option value="drawing">Drawing</option>
            </select><br/>
            <div className="equation-controls">
              <textarea
                value={safeEquationContent.latex || ''}
                onChange={(e) => {
                  const newContent = { 
                    ...(content || {}), 
                    latex: e.target.value 
                  };
                  setContent(newContent);
                  updateBlock(block.id, newContent);
                }}
                className="equation-input"
                placeholder="Enter LaTeX equation... (e.g., E = mc^2, \\frac{a}{b}, \\sum_{i=1}^n x_i)"
                rows="3"
                autoFocus
              />
              <div className="equation-preview">
                <strong>Preview:</strong>
                <LaTeXRenderer latex={safeEquationContent.latex || ''} />
              </div>
            </div>
            <button 
              className="add-block-below"
              onClick={() => addBlock('paragraph', index)}
            >
              +
            </button>
            <button onClick={onFinishEditing}>Done</button>
          </div>
        ) : editMode ? (
          <div className="equation-controls">
            <textarea
              value={safeEquationContent.latex || ''}
              onChange={(e) => {
                const newContent = { 
                  ...(content || {}), 
                  latex: e.target.value 
                };
                setContent(newContent);
                updateBlock(block.id, newContent);
              }}
              className="equation-input"
              placeholder="Enter LaTeX equation..."
              rows="3"
            />
            <div className="equation-preview">
              <strong>Preview:</strong>
              <LaTeXRenderer latex={safeEquationContent.latex || ''} />
            </div>
          </div>
        ) : (
          <div 
            className={`equation-display ${isSelected ? 'selected' : ''}`}
            onDoubleClick={() => onDoubleClick(block.id)}
            onClick={() => onSelect(block.id)}
          >
            <LaTeXRenderer latex={safeEquationContent.latex || ''} />
          </div>
        );
      case 'drawing':
        const safeDrawingContent = content && typeof content === 'object' 
          ? content 
          : { strokes: [], width: 400, height: 300 };
          
        return isEditing ? (
          <div className="editing-block">
            <select
              value={block.type}
              onChange={handleTypeChange}
            >
              <option value="paragraph">Paragraph</option>
              <option value="heading">Heading</option>
              <option value="list">List</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="equation">Equation</option>
              <option value="drawing">Drawing</option>
            </select><br/>
            <DrawingCanvas 
              content={safeDrawingContent}
              onUpdate={(newContent) => {
                setContent(newContent);
                updateBlock(block.id, newContent);
              }}
              isEditing={true}
            />
            <button 
              className="add-block-below"
              onClick={() => addBlock('paragraph', index)}
            >
              +
            </button>
            <button onClick={onFinishEditing}>Done</button>
          </div>
        ) : editMode ? (
          <DrawingCanvas 
            content={safeDrawingContent}
            onUpdate={(newContent) => {
              setContent(newContent);
              updateBlock(block.id, newContent);
            }}
            isEditing={true}
          />
        ) : (
          <div 
            className={`drawing-display ${isSelected ? 'selected' : ''}`}
            onDoubleClick={() => onDoubleClick(block.id)}
            onClick={() => onSelect(block.id)}
          >
            <DrawingCanvas 
              content={safeDrawingContent}
              onUpdate={() => {}}
              isEditing={false}
            />
          </div>
        );
    }
  };

  return (
    <div ref={preview} style={{ position: 'relative' }}>
      <div 
        ref={ref}
        className={`block 
          ${isDragging ? 'dragging' : ''} 
          ${isOver ? 'drop-target' : ''}
          ${isSelected ? 'selected' : ''}
        `}
        style={{
          opacity: isDragging ? 0.5 : 1,
          marginBottom: editMode || isEditing ? '1.5rem' : '0.2rem',
          cursor: (dragMode || selectMode) ? 'move' : 'default',
          userSelect: isDragging ? 'none' : 'auto',
        }}
        onMouseDown={(e) => {
          if (!dragMode && !selectMode) {
            e.stopPropagation();
          }
        }}
      >
        {editMode && !isEditing && (
          <div className="block-toolbar">
            <select
              value={block.type}
              onChange={handleTypeChange}
            >
              <option value="paragraph">Paragraph</option>
              <option value="heading">Heading</option>
              <option value="list">List</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="equation">Equation</option>
              <option value="drawing">Drawing</option>
            </select>
            <button onClick={() => moveBlock(block.id, 'up')} disabled={isFirst}>↑</button>
            <button onClick={() => moveBlock(block.id, 'down')} disabled={isLast}>↓</button>
            <button onClick={() => deleteBlock(block.id)}>Delete</button>
          </div>
        )}
        {renderBlockContent()}
        {editMode && !isEditing && (
          <button 
            className="add-block-below"
            onClick={() => addBlock('paragraph', index)}
          >
            +
          </button>
        )}
      </div>
    </div>
  );
};

export default FileEditor;