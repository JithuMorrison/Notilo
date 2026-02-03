import React, { useState, useRef, useEffect } from 'react';
import { Pencil, Image, Video, Download, Upload, Trash2, Move, Bold, Italic, Type, Palette, Undo, Redo, Eraser } from 'lucide-react';

export default function MarkdownEditor() {
  const [markdown, setMarkdown] = useState('');
  const [elements, setElements] = useState([]);
  const [selectedTool, setSelectedTool] = useState('text');
  const [drawColor, setDrawColor] = useState('#000000');
  const [selectedElement, setSelectedElement] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);
  const [saveStatus, setSaveStatus] = useState('');
  const [history, setHistory] = useState([]);
  const [redoHistory, setRedoHistory] = useState([]);
  const [exportFormat, setExportFormat] = useState('html');
  const textareaRef = useRef(null);
  const canvasRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  // Load content from localStorage on component mount
  useEffect(() => {
    try {
      const savedData = JSON.parse(localStorage.getItem('markdownEditor_data') || '{}');
      
      if (savedData.markdown) {
        setMarkdown(savedData.markdown);
      }
      
      if (savedData.elements) {
        setElements(savedData.elements);
      }
      
      if (savedData.markdown || savedData.elements) {
        setSaveStatus('Loaded from storage');
        setTimeout(() => setSaveStatus(''), 2000);
      }
    } catch (error) {
      console.error('Error loading from storage:', error);
    }
  }, []);

  // Auto-save to localStorage periodically
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      try {
        const dataToSave = {
          markdown,
          elements
        };
        localStorage.setItem('markdownEditor_data', JSON.stringify(dataToSave));
      } catch (error) {
        console.error('Error saving:', error);
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [markdown, elements]);

  // Clear all content and storage
  const clearAll = () => {
    if (window.confirm('Are you sure you want to clear all content? This action cannot be undone.')) {
      setMarkdown('');
      setElements([]);
      setHistory([]);
      setRedoHistory([]);
      localStorage.removeItem('markdownEditor_data');
      setSaveStatus('Cleared');
      setTimeout(() => setSaveStatus(''), 2000);
    }
  };

  // Undo function
  const undo = () => {
    if (history.length > 0) {
      const currentState = { elements: [...elements] };
      const lastState = history[history.length - 1];
      
      setRedoHistory([...redoHistory, currentState]);
      setElements(lastState.elements);
      setHistory(history.slice(0, -1));
      
      setSaveStatus('Undone');
      setTimeout(() => setSaveStatus(''), 1000);
    }
  };

  // Redo function
  const redo = () => {
    if (redoHistory.length > 0) {
      const currentState = { elements: [...elements] };
      const nextState = redoHistory[redoHistory.length - 1];
      
      setHistory([...history, currentState]);
      setElements(nextState.elements);
      setRedoHistory(redoHistory.slice(0, -1));
      
      setSaveStatus('Redone');
      setTimeout(() => setSaveStatus(''), 1000);
    }
  };

  // Helper function to save state to history
  const saveToHistory = () => {
    setHistory([...history, { elements: [...elements] }]);
    setRedoHistory([]);
  };

  // Helper function to convert YouTube URL to embed URL
  const convertToEmbedUrl = (url) => {
    if (!url) return url;
    
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(youtubeRegex);
    
    if (match) {
      const videoId = match[1];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    
    const vimeoRegex = /(?:vimeo\.com\/)([0-9]+)/;
    const vimeoMatch = url.match(vimeoRegex);
    
    if (vimeoMatch) {
      const videoId = vimeoMatch[1];
      return `https://player.vimeo.com/video/${videoId}`;
    }
    
    return url;
  };

  const insertMarkdown = (before, after = '') => {
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = markdown.substring(start, end);
    const newText = markdown.substring(0, start) + before + selectedText + after + markdown.substring(end);
    setMarkdown(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  const insertBold = () => insertMarkdown('**', '**');
  const insertItalic = () => insertMarkdown('*', '*');
  const insertColor = () => {
    const color = prompt('Enter color (e.g., red, blue, #FF0000):');
    if (color) {
      insertMarkdown(`[c=${color}]`, '[/c]');
    }
  };
  const insertFontSize = () => {
    const size = prompt('Enter font size (e.g., 20, 24, 30):');
    if (size) {
      insertMarkdown(`[f=${size}]`, '[/f]');
    }
  };

  const insertEquation = () => {
    const equation = prompt('Enter LaTeX equation (e.g., E = mc^2, \\frac{a}{b}, \\sum_{i=1}^n x_i):');
    if (equation) {
      insertMarkdown(`[eq]${equation}[/eq]`, '');
    }
  };

  const parseMarkdown = (text) => {
    let html = text;
    
    const renderLaTeX = (latex) => {
      if (!latex) return '';
      
      let latexHtml = latex;
      
      const replacements = [
        [/\\frac\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, 
         '<span class="fraction"><span class="fraction-line"><span class="numerator">$1</span><span class="denominator">$2</span></span></span>'],
        [/\^(\w+|\{[^}]+\})/g, (match, p1) => `<sup>${p1.replace(/[{}]/g, '')}</sup>`],
        [/_(\w+|\{[^}]+\})/g, (match, p1) => `<sub>${p1.replace(/[{}]/g, '')}</sub>`],
        [/\\sqrt\{([^}]+)\}/g, '<span class="sqrt">√<span class="sqrt-content">$1</span></span>'],
        [/\^2(?!\d)/g, '²'], [/\^3(?!\d)/g, '³'], [/\^4(?!\d)/g, '⁴'], [/\^5(?!\d)/g, '⁵'],
        [/_0(?!\d)/g, '₀'], [/_1(?!\d)/g, '₁'], [/_2(?!\d)/g, '₂'], [/_3(?!\d)/g, '₃'],
        [/\\alpha/g, 'α'], [/\\beta/g, 'β'], [/\\gamma/g, 'γ'], [/\\delta/g, 'δ'],
        [/\\theta/g, 'θ'], [/\\lambda/g, 'λ'], [/\\pi/g, 'π'], [/\\sigma/g, 'σ'],
        [/\\infty/g, '∞'], [/\\pm/g, '±'], [/\\times/g, '×'], [/\\leq/g, '≤'], [/\\geq/g, '≥'],
        [/\\sum_\{([^}]+)\}\^\{([^}]+)\}/g, '<span class="big-op">∑<sub class="op-sub">$1</sub><sup class="op-sup">$2</sup></span>'],
        [/\\int_\{([^}]+)\}\^\{([^}]+)\}/g, '<span class="big-op">∫<sub class="op-sub">$1</sub><sup class="op-sup">$2</sup></span>'],
        [/\\sum/g, '∑'], [/\\int/g, '∫'], [/\\prod/g, '∏'],
        [/\\text\{([^}]+)\}/g, '<span class="math-text">$1</span>'],
      ];
      
      replacements.forEach(([pattern, replacement]) => {
        latexHtml = latexHtml.replace(pattern, replacement);
      });
      
      return latexHtml;
    };
    
    // Parse line spacing first - handle multi-line content
    html = html.replace(/\[lsp=([0-9.]+)\]([\s\S]*?)\[\/lsp\]/g, (match, spacing, content) => {
      return `<div style="line-height: ${spacing}">${content}</div>`;
    });
    
    // Parse equation tags
    html = html.replace(/\[eq\](.*?)\[\/eq\]/gs, (match, latexCode) => {
      return `<div class="equation-display" data-latex="${latexCode.replace(/"/g, '&quot;')}">${renderLaTeX(latexCode)}</div>`;
    });
    
    html = html.replace(/\[space=(\d+)\]\[\/space\]/g, '<div style="height: $1px"></div>');
    html = html.replace(/\[c=([a-zA-Z0-9#]+)\](.*?)\[\/c\]/gs, '<span style="color: $1">$2</span>');
    html = html.replace(/\[f=(\d+)\](.*?)\[\/f\]/gs, '<span style="font-size: $1px">$2</span>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+?)\*/g, '<em>$1</em>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    html = html.split('\n').map(line => {
      if (line.startsWith('<h') || line.startsWith('<div')) return line;
      return line + '<br>';
    }).join('');
    
    html = html.replace(/>([^<]+)</g, (match, text) => {
      return '>' + text.replace(/ /g, '&nbsp;') + '<';
    });
    
    return html;
  };

  const addImageElement = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      saveToHistory();
      const newElement = {
        id: Date.now(),
        type: 'image',
        src: url,
        x: 100,
        y: 100,
        width: 200,
        height: 150
      };
      setElements([...elements, newElement]);
    }
  };

  const addVideoElement = () => {
    const url = prompt('Enter video URL (YouTube, Vimeo, or embed link):');
    if (url) {
      saveToHistory();
      const embedUrl = convertToEmbedUrl(url);
      const newElement = {
        id: Date.now(),
        type: 'video',
        src: embedUrl,
        originalUrl: url,
        x: 100,
        y: 100,
        width: 400,
        height: 300
      };
      setElements([...elements, newElement]);
    }
  };

  const handleMouseDown = (e, element) => {
    if (selectedTool === 'move') {
      e.stopPropagation();
      setSelectedElement(element.id);
      setIsDragging(true);
      const rect = canvasRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left - element.x,
        y: e.clientY - rect.top - element.y
      });
    } else if (selectedTool === 'eraser' && element.type === 'drawing') {
      saveToHistory();
      setElements(elements.filter(el => el.id !== element.id));
    }
  };

  const handleMouseMove = (e) => {
    if (selectedTool === 'pencil' && isDrawing) {
      const rect = canvasRef.current.getBoundingClientRect();
      setCurrentPath([...currentPath, {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }]);
    } else if (selectedTool === 'eraser' && isDrawing) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Check if mouse is over any drawing and erase it
      elements.forEach(el => {
        if (el.type === 'drawing') {
          const isNear = el.path.some(p => 
            Math.abs(p.x - x) < 10 && Math.abs(p.y - y) < 10
          );
          if (isNear) {
            setElements(prev => prev.filter(item => item.id !== el.id));
          }
        }
      });
    } else if (isDragging && selectedElement) {
      const rect = canvasRef.current.getBoundingClientRect();
      setElements(elements.map(el => 
        el.id === selectedElement 
          ? { ...el, x: e.clientX - rect.left - dragOffset.x, y: e.clientY - rect.top - dragOffset.y }
          : el
      ));
    }
  };

  const handleMouseUp = () => {
    if (selectedTool === 'pencil' && currentPath.length > 0) {
      saveToHistory();
      const newElement = {
        id: Date.now(),
        type: 'drawing',
        path: currentPath,
        color: drawColor
      };
      setElements([...elements, newElement]);
      setCurrentPath([]);
    }
    setIsDragging(false);
    setIsDrawing(false);
  };

  const handleCanvasMouseDown = (e) => {
    if (selectedTool === 'pencil' || selectedTool === 'eraser') {
      setIsDrawing(true);
      if (selectedTool === 'pencil') {
        const rect = canvasRef.current.getBoundingClientRect();
        setCurrentPath([{ x: e.clientX - rect.left, y: e.clientY - rect.top }]);
      }
    }
  };

  const deleteElement = () => {
    if (selectedElement) {
      saveToHistory();
      setElements(elements.filter(el => el.id !== selectedElement));
      setSelectedElement(null);
    }
  };

  const resizeElement = (id, dimension, value) => {
    setElements(elements.map(el => 
      el.id === id ? { ...el, [dimension]: parseInt(value) } : el
    ));
  };

  const toggleTool = (tool) => {
    if (selectedTool === tool) {
      setSelectedTool('text');
    } else {
      setSelectedTool(tool);
    }
  };

  // Export function
  const exportDocument = () => {
    if (exportFormat === 'json') {
      const data = {
        version: '1.0',
        markdown,
        elements
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'document.json';
      a.click();
      URL.revokeObjectURL(url);
      
      setSaveStatus('JSON Exported');
      setTimeout(() => setSaveStatus(''), 2000);
    } else {
      // HTML Export
      const parsedHTML = parseMarkdown(markdown);
      
      let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Document</title>
    <style>
        body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
        .container { position: relative; width: 100%; min-height: 100vh; background: white; }
        .content { font-size: 16px; line-height: 1.6; }
        .element { position: absolute; }
        svg { position: absolute; top: 0; left: 0; pointer-events: none; width: 100%; height: 100%; }
        h1 { font-size: 32px; font-weight: bold; margin: 16px 0; }
        h2 { font-size: 24px; font-weight: bold; margin: 14px 0; }
        h3 { font-size: 20px; font-weight: bold; margin: 12px 0; }
        
        .equation-display {
          display: block;
          font-family: 'Times New Roman', serif;
          font-size: 1.3rem;
          margin: 1em 0;
          padding: 1em;
          background: #f8f9fa;
          border-radius: 4px;
          text-align: center;
        }
        
        .fraction {
          display: inline-block;
          vertical-align: middle;
          margin: 0 0.2em;
        }
        
        .fraction-line {
          display: inline-block;
          vertical-align: middle;
        }
        
        .fraction .numerator {
          display: block;
          border-bottom: 2px solid currentColor;
          padding: 0.1em 0.3em;
          text-align: center;
          font-size: 0.9em;
        }
        
        .fraction .denominator {
          display: block;
          padding: 0.1em 0.3em;
          text-align: center;
          font-size: 0.9em;
        }
        
        .sqrt {
          display: inline-block;
          position: relative;
          margin: 0 0.2em;
        }
        
        .sqrt-content {
          border-top: 2px solid currentColor;
          padding: 0.1em 0.3em 0 0.1em;
          margin-left: 0.3em;
        }
        
        .big-op {
          display: inline-block;
          position: relative;
          font-size: 1.8em;
          margin: 0 0.3em;
          vertical-align: middle;
        }
        
        .op-sub {
          position: absolute;
          bottom: -0.6em;
          left: 50%;
          transform: translateX(-50%);
          font-size: 0.6em;
          white-space: nowrap;
        }
        
        .op-sup {
          position: absolute;
          top: -0.6em;
          left: 50%;
          transform: translateX(-50%);
          font-size: 0.6em;
          white-space: nowrap;
        }
    </style>
</head>
<body>
    <div class="container">
        <svg width="100%" height="100%">`;

      elements.forEach(el => {
        if (el.type === 'drawing') {
          const pathData = el.path.map((p, i) => 
            i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
          ).join(' ');
          html += `\n            <path d="${pathData}" stroke="${el.color}" fill="none" stroke-width="2"/>`;
        }
      });

      html += `\n        </svg>
        <div class="content">${parsedHTML}</div>`;

      elements.forEach(el => {
        if (el.type === 'image') {
          html += `\n        <img class="element" src="${el.src}" style="left: ${el.x}px; top: ${el.y}px; width: ${el.width}px; height: ${el.height}px;"/>`;
        } else if (el.type === 'video') {
          html += `\n        <div class="element" style="left: ${el.x}px; top: ${el.y}px; width: ${el.width}px; height: ${el.height}px;"><iframe src="${el.src}" style="width: 100%; height: 100%; border: none;" allowfullscreen></iframe></div>`;
        }
      });

      html += `\n    </div>
</body>
</html>`;

      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'document.html';
      a.click();
      URL.revokeObjectURL(url);
      
      setSaveStatus('HTML Exported');
      setTimeout(() => setSaveStatus(''), 2000);
    }
  };

  // Load function
  const loadDocument = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = exportFormat === 'json' ? '.json' : '.html';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (exportFormat === 'json') {
            // Load JSON
            try {
              const data = JSON.parse(event.target.result);
              
              if (data.markdown !== undefined) {
                setMarkdown(data.markdown);
              }
              
              if (data.elements) {
                setElements(data.elements);
              }
              
              setSaveStatus('JSON Loaded');
              setTimeout(() => setSaveStatus(''), 2000);
            } catch (error) {
              alert('Error loading JSON file: ' + error.message);
            }
          } else {
            // Load HTML
            const htmlContent = event.target.result;
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');
            const contentDiv = doc.querySelector('.content');
            
            if (contentDiv) {
              let extractedText = contentDiv.innerHTML;
              
              // Extract equations with data-latex attribute
              const equationDivs = contentDiv.querySelectorAll('.equation-display[data-latex]');
              equationDivs.forEach(eqDiv => {
                const latex = eqDiv.getAttribute('data-latex');
                const placeholder = `___EQUATION_${Date.now()}_${Math.random()}___`;
                extractedText = extractedText.replace(eqDiv.outerHTML, placeholder);
                extractedText = extractedText.replace(placeholder, `[eq]${latex}[/eq]\n`);
              });
              
              // Extract line spacing divs
              const lspPattern = /<div style="line-height:\s*([0-9.]+)">([\s\S]*?)<\/div>/gi;
              extractedText = extractedText.replace(lspPattern, (match, spacing, content) => {
                // Remove inner HTML tags but keep the content structure
                let innerContent = content.replace(/<br\s*\/?>/gi, '\n');
                return `[lsp=${spacing}]\n${innerContent}\n[/lsp]`;
              });
              
              extractedText = extractedText.replace(/<br\s*\/?>/gi, '\n');
              extractedText = extractedText.replace(/<h1>(.*?)<\/h1>/gi, '# $1\n');
              extractedText = extractedText.replace(/<h2>(.*?)<\/h2>/gi, '## $1\n');
              extractedText = extractedText.replace(/<h3>(.*?)<\/h3>/gi, '### $1\n');
              extractedText = extractedText.replace(/<strong>(.*?)<\/strong>/gi, '**$1**');
              extractedText = extractedText.replace(/<em>(.*?)<\/em>/gi, '*$1*');
              extractedText = extractedText.replace(/<span style="color:\s*([^"]+)">(.*?)<\/span>/gi, '[c=$1]$2[/c]');
              extractedText = extractedText.replace(/<span style="font-size:\s*(\d+)px">(.*?)<\/span>/gi, '[f=$1]$2[/f]');
              extractedText = extractedText.replace(/<div style="height:\s*(\d+)px"><\/div>/gi, '[space=$1][/space]');
              
              extractedText = extractedText.replace(/<[^>]+>/g, '');
              extractedText = extractedText.replace(/&nbsp;/g, ' ');
              extractedText = extractedText.replace(/&lt;/g, '<');
              extractedText = extractedText.replace(/&gt;/g, '>');
              extractedText = extractedText.replace(/&amp;/g, '&');
              extractedText = extractedText.replace(/&quot;/g, '"');
              
              setMarkdown(extractedText);
            }
            
            const svgPaths = doc.querySelectorAll('svg path');
            const imgs = doc.querySelectorAll('img.element');
            const videoContainers = doc.querySelectorAll('.element iframe');
            
            const loadedElements = [];
            
            svgPaths.forEach((path, index) => {
              const d = path.getAttribute('d');
              const stroke = path.getAttribute('stroke');
              if (d) {
                const pathPoints = d.split(/[ML]/).filter(p => p.trim()).map(p => {
                  const [x, y] = p.trim().split(' ').map(Number);
                  return { x, y };
                });
                loadedElements.push({
                  id: Date.now() + index,
                  type: 'drawing',
                  path: pathPoints,
                  color: stroke || '#000000'
                });
              }
            });
            
            imgs.forEach((img, index) => {
              const style = img.style;
              loadedElements.push({
                id: Date.now() + 1000 + index,
                type: 'image',
                src: img.getAttribute('src'),
                x: parseInt(style.left) || 100,
                y: parseInt(style.top) || 100,
                width: parseInt(style.width) || 200,
                height: parseInt(style.height) || 150
              });
            });
            
            videoContainers.forEach((iframe, index) => {
              const parentDiv = iframe.parentElement;
              if (parentDiv && parentDiv.classList.contains('element')) {
                const style = parentDiv.style;
                loadedElements.push({
                  id: Date.now() + 2000 + index,
                  type: 'video',
                  src: iframe.getAttribute('src'),
                  x: parseInt(style.left) || 100,
                  y: parseInt(style.top) || 100,
                  width: parseInt(style.width) || 400,
                  height: parseInt(style.height) || 300
                });
              }
            });
            
            setElements(loadedElements);
            setSaveStatus('HTML Loaded');
            setTimeout(() => setSaveStatus(''), 2000);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const toolbarStyle = {
    backgroundColor: 'white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    padding: '16px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    alignItems: 'center',
    borderBottom: '1px solid #e5e7eb'
  };

  const buttonStyle = {
    padding: '8px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    backgroundColor: '#e5e7eb'
  };

  const activeButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#3b82f6',
    color: 'white'
  };

  const separatorStyle = {
    width: '1px',
    height: '32px',
    backgroundColor: '#d1d5db',
    margin: '0 8px'
  };

  const selectedElementData = elements.find(el => el.id === selectedElement);

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f3f4f6' }}>
      {/* Toolbar */}
      <div style={toolbarStyle}>
        <button
          onClick={() => toggleTool('pencil')}
          style={selectedTool === 'pencil' ? activeButtonStyle : buttonStyle}
          title="Pencil Tool"
        >
          <Pencil size={20} />
        </button>
        <button
          onClick={() => toggleTool('eraser')}
          style={selectedTool === 'eraser' ? activeButtonStyle : buttonStyle}
          title="Eraser Tool"
        >
          <Eraser size={20} />
        </button>
        <button
          onClick={() => toggleTool('move')}
          style={selectedTool === 'move' ? activeButtonStyle : buttonStyle}
          title="Move Tool"
        >
          <Move size={20} />
        </button>
        
        <div style={separatorStyle}></div>
        
        <input
          type="color"
          value={drawColor}
          onChange={(e) => setDrawColor(e.target.value)}
          style={{ width: '40px', height: '40px', borderRadius: '4px', cursor: 'pointer', border: 'none' }}
          title="Drawing Color"
        />
        
        <div style={separatorStyle}></div>
        
        <button
          onClick={addImageElement}
          style={buttonStyle}
          title="Add Image"
        >
          <Image size={20} />
        </button>
        <button
          onClick={addVideoElement}
          style={buttonStyle}
          title="Add Video"
        >
          <Video size={20} />
        </button>
        
        <div style={separatorStyle}></div>
        
        <button
          onClick={undo}
          disabled={history.length === 0}
          style={{
            ...buttonStyle,
            backgroundColor: history.length === 0 ? '#d1d5db' : '#8b5cf6',
            color: 'white',
            cursor: history.length === 0 ? 'not-allowed' : 'pointer',
            opacity: history.length === 0 ? 0.5 : 1
          }}
          title="Undo"
        >
          <Undo size={20} />
        </button>
        
        <button
          onClick={redo}
          disabled={redoHistory.length === 0}
          style={{
            ...buttonStyle,
            backgroundColor: redoHistory.length === 0 ? '#d1d5db' : '#8b5cf6',
            color: 'white',
            cursor: redoHistory.length === 0 ? 'not-allowed' : 'pointer',
            opacity: redoHistory.length === 0 ? 0.5 : 1
          }}
          title="Redo"
        >
          <Redo size={20} />
        </button>
        
        <button
          onClick={deleteElement}
          disabled={!selectedElement}
          style={{ 
            ...buttonStyle, 
            backgroundColor: selectedElement ? '#ef4444' : '#d1d5db', 
            color: 'white',
            cursor: selectedElement ? 'pointer' : 'not-allowed',
            opacity: selectedElement ? 1 : 0.5
          }}
          title="Delete Selected"
        >
          <Trash2 size={20} />
        </button>
        
        <div style={{ flex: 1 }}></div>

        {selectedElementData && (selectedElementData.type === 'image' || selectedElementData.type === 'video') && (
          <>
            <label style={{ fontSize: '14px', marginRight: '4px' }}>Width:</label>
            <input
              type="number"
              value={selectedElementData.width}
              onChange={(e) => resizeElement(selectedElement, 'width', e.target.value)}
              style={{ width: '70px', padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px', marginRight: '8px' }}
              min="50"
            />
            <label style={{ fontSize: '14px', marginRight: '4px' }}>Height:</label>
            <input
              type="number"
              value={selectedElementData.height}
              onChange={(e) => resizeElement(selectedElement, 'height', e.target.value)}
              style={{ width: '70px', padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px', marginRight: '8px' }}
              min="50"
            />
          </>
        )}
        
        <select
          value={exportFormat}
          onChange={(e) => setExportFormat(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '4px',
            border: '1px solid #d1d5db',
            backgroundColor: 'white',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          <option value="html">HTML</option>
          <option value="json">JSON</option>
        </select>
        
        <button
          onClick={loadDocument}
          style={{ ...buttonStyle, backgroundColor: '#22c55e', color: 'white', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Upload size={20} /> Load
        </button>
        <button
          onClick={exportDocument}
          style={{ ...buttonStyle, backgroundColor: '#3b82f6', color: 'white', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Download size={20} /> Export
        </button>
        <button
          onClick={clearAll}
          style={{ ...buttonStyle, backgroundColor: '#ef4444', color: 'white', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Trash2 size={20} /> Clear All
        </button>
        
        {saveStatus && (
          <div style={{ 
            padding: '8px 12px', 
            backgroundColor: '#22c55e', 
            color: 'white', 
            borderRadius: '4px', 
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center'
          }}>
            {saveStatus}
          </div>
        )}
      </div>

      {/* Split View */}
      <div style={{ display: 'flex', flex: 1, gap: '16px', padding: '16px', overflow: 'hidden' }}>
        {/* Markdown Editor */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold', fontSize: '14px' }}>
            Markdown Editor
          </div>
          
          {/* Formatting Toolbar */}
          <div style={{ padding: '8px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            <button
              onClick={insertBold}
              style={{ ...buttonStyle, padding: '6px 10px', fontSize: '12px' }}
              title="Bold"
            >
              <Bold size={16} />
            </button>
            <button
              onClick={insertItalic}
              style={{ ...buttonStyle, padding: '6px 10px', fontSize: '12px' }}
              title="Italic"
            >
              <Italic size={16} />
            </button>
            <button
              onClick={insertColor}
              style={{ ...buttonStyle, padding: '6px 10px', fontSize: '12px' }}
              title="Text Color"
            >
              <Palette size={16} />
            </button>
            <button
              onClick={insertFontSize}
              style={{ ...buttonStyle, padding: '6px 10px', fontSize: '12px' }}
              title="Font Size"
            >
              <Type size={16} />
            </button>
            <button
              onClick={insertEquation}
              style={{ ...buttonStyle, padding: '6px 10px', fontSize: '12px' }}
              title="Insert Equation"
            >
              ∑
            </button>
            <div style={{ fontSize: '11px', color: '#6b7280', padding: '6px 10px', display: 'flex', alignItems: 'center' }}>
              Syntax: # Heading, **bold**, *italic*, [c=red]text[/c], [f=20]text[/f], [lsp=2]text[/lsp], [space=20][/space], [eq]LaTeX[/eq]
            </div>
          </div>

          <textarea
            ref={textareaRef}
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            style={{
              flex: 1,
              padding: '16px',
              border: 'none',
              outline: 'none',
              fontFamily: 'monospace',
              fontSize: '14px',
              lineHeight: '1.6',
              resize: 'none'
            }}
            placeholder="Type your markdown here...

Examples:
# Heading 1
## Heading 2
### Heading 3

**bold text**
*italic text*

[c=red]red text[/c]
[c=#0000ff]blue text[/c]
[f=24]large text[/f]
[lsp=2]text with line spacing 2[/lsp]
[space=50][/space]

Equations:
[eq]E = mc^2[/eq]
[eq]\\frac{a}{b} + \\sqrt{x^2 + y^2}[/eq]
[eq]\\sum_{i=1}^n x_i = \\int_0^\\infty e^{-x} dx[/eq]"
          />
        </div>

        {/* HTML Preview */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold', fontSize: '14px' }}>
            Preview
          </div>
          <div
            ref={canvasRef}
            style={{
              flex: 1,
              position: 'relative',
              overflow: 'auto',
              cursor: selectedTool === 'pencil' ? 'crosshair' : selectedTool === 'eraser' ? 'pointer' : 'default',
              userSelect: 'none'
            }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
              {elements.filter(el => el.type === 'drawing').map(el => (
                <path
                  key={el.id}
                  d={el.path.map((p, i) => i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`).join(' ')}
                  stroke={el.color}
                  fill="none"
                  strokeWidth="2"
                  style={{ pointerEvents: 'stroke', cursor: selectedTool === 'eraser' ? 'pointer' : 'default' }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleMouseDown(e, el);
                  }}
                />
              ))}
              {currentPath.length > 0 && (
                <path
                  d={currentPath.map((p, i) => i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`).join(' ')}
                  stroke={drawColor}
                  fill="none"
                  strokeWidth="2"
                />
              )}
            </svg>

            <div
              style={{
                padding: '20px',
                fontSize: '16px',
                lineHeight: '1.6',
                fontFamily: 'Arial, sans-serif'
              }}
              dangerouslySetInnerHTML={{ __html: parseMarkdown(markdown) }}
            />

            {elements.map(el => {
              if (el.type === 'image') {
                return (
                  <img
                    key={el.id}
                    src={el.src}
                    style={{
                      position: 'absolute',
                      cursor: selectedTool === 'move' ? 'move' : 'pointer',
                      left: el.x,
                      top: el.y,
                      width: el.width,
                      height: el.height,
                      outline: selectedElement === el.id ? '2px solid #3b82f6' : 'none',
                      zIndex: 5
                    }}
                    onMouseDown={(e) => handleMouseDown(e, el)}
                    onClick={() => setSelectedElement(el.id)}
                    alt="Content"
                  />
                );
              } else if (el.type === 'video') {
                return (
                  <div
                    key={el.id}
                    style={{
                      position: 'absolute',
                      left: el.x,
                      top: el.y,
                      width: el.width,
                      height: el.height,
                      outline: selectedElement === el.id ? '2px solid #3b82f6' : 'none',
                      zIndex: 5
                    }}
                    onMouseDown={(e) => handleMouseDown(e, el)}
                    onClick={() => setSelectedElement(el.id)}
                  >
                    <iframe
                      src={el.src}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        pointerEvents: selectedTool === 'move' ? 'none' : 'auto'
                      }}
                      allowFullScreen
                    />
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}