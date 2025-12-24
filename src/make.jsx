import React, { useState, useRef, useEffect } from 'react';
import { Pencil, Image, Video, Download, Upload, Trash2, Move, Bold, Italic, Type, Palette } from 'lucide-react';

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
      [/\^2(?!\d)/g, '²'], [/\^3(?!\d)/g, '³'], [/\^4(?!\d)/g, '⁴'], [/\^5(?!\d)/g, '⁵'],
      [/\^6(?!\d)/g, '⁶'], [/\^7(?!\d)/g, '⁷'], [/\^8(?!\d)/g, '⁸'], [/\^9(?!\d)/g, '⁹'],
      [/\^0(?!\d)/g, '⁰'], [/\^1(?!\d)/g, '¹'],
      
      // Subscripts
      [/_0(?!\d)/g, '₀'], [/_1(?!\d)/g, '₁'], [/_2(?!\d)/g, '₂'], [/_3(?!\d)/g, '₃'],
      [/_4(?!\d)/g, '₄'], [/_5(?!\d)/g, '₅'], [/_6(?!\d)/g, '₆'], [/_7(?!\d)/g, '₇'],
      [/_8(?!\d)/g, '₈'], [/_9(?!\d)/g, '₉'],
      
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
  const textareaRef = useRef(null);
  const canvasRef = useRef(null);

  // Load content from localStorage on component mount
  useEffect(() => {
    const savedMarkdown = localStorage.getItem('markdownEditor_markdown');
    const savedElements = localStorage.getItem('markdownEditor_elements');
    
    if (savedMarkdown) {
      setMarkdown(savedMarkdown);
    }
    
    if (savedElements) {
      try {
        setElements(JSON.parse(savedElements));
      } catch (error) {
        console.error('Error parsing saved elements:', error);
      }
    }
    
    setSaveStatus('Loaded from storage');
    setTimeout(() => setSaveStatus(''), 2000);
  }, []);

  // Save content to localStorage whenever markdown or elements change
  useEffect(() => {
    if (markdown !== '') {
      localStorage.setItem('markdownEditor_markdown', markdown);
      setSaveStatus('Saved');
      setTimeout(() => setSaveStatus(''), 1000);
    }
  }, [markdown]);

  useEffect(() => {
    if (elements.length > 0) {
      localStorage.setItem('markdownEditor_elements', JSON.stringify(elements));
      setSaveStatus('Saved');
      setTimeout(() => setSaveStatus(''), 1000);
    }
  }, [elements]);

  // Clear all content and localStorage
  const clearAll = () => {
    if (window.confirm('Are you sure you want to clear all content? This action cannot be undone.')) {
      setMarkdown('');
      setElements([]);
      localStorage.removeItem('markdownEditor_markdown');
      localStorage.removeItem('markdownEditor_elements');
      setSaveStatus('Cleared');
      setTimeout(() => setSaveStatus(''), 2000);
    }
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
    
    // Helper function for LaTeX rendering (same as LaTeXRenderer component)
    const renderLaTeX = (latex) => {
      if (!latex) return '';
      
      let latexHtml = latex;
      
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
        [/\^2(?!\d)/g, '²'], [/\^3(?!\d)/g, '³'], [/\^4(?!\d)/g, '⁴'], [/\^5(?!\d)/g, '⁵'],
        [/\^6(?!\d)/g, '⁶'], [/\^7(?!\d)/g, '⁷'], [/\^8(?!\d)/g, '⁸'], [/\^9(?!\d)/g, '⁹'],
        [/\^0(?!\d)/g, '⁰'], [/\^1(?!\d)/g, '¹'],
        
        // Subscripts
        [/_0(?!\d)/g, '₀'], [/_1(?!\d)/g, '₁'], [/_2(?!\d)/g, '₂'], [/_3(?!\d)/g, '₃'],
        [/_4(?!\d)/g, '₄'], [/_5(?!\d)/g, '₅'], [/_6(?!\d)/g, '₆'], [/_7(?!\d)/g, '₇'],
        [/_8(?!\d)/g, '₈'], [/_9(?!\d)/g, '₉'],
        
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
        latexHtml = latexHtml.replace(pattern, replacement);
      });
      
      return latexHtml;
    };
    
    // Parse equation tags: [eq]LaTeX code[/eq]
    html = html.replace(/\[eq\](.*?)\[\/eq\]/gs, (match, latexCode) => {
      return `<div class="equation-display">${renderLaTeX(latexCode)}</div>`;
    });
    
    // Parse line spacing tags: [lsp=2]text[/lsp]
    html = html.replace(/\[lsp=([0-9.]+)\](.*?)\[\/lsp\]/gs, '<div style="line-height: $1">$2</div>');
    
    // Parse space tags: [space=20][/space]
    html = html.replace(/\[space=(\d+)\]\[\/space\]/g, '<div style="height: $1px"></div>');
    
    // Parse color tags: [c=red]text[/c] or [c=#FF0000]text[/c]
    html = html.replace(/\[c=([a-zA-Z0-9#]+)\](.*?)\[\/c\]/gs, '<span style="color: $1">$2</span>');
    
    // Parse font size tags: [f=20]text[/f]
    html = html.replace(/\[f=(\d+)\](.*?)\[\/f\]/gs, '<span style="font-size: $1px">$2</span>');
    
    // Bold: **text**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Italic: *text*
    html = html.replace(/\*([^*]+?)\*/g, '<em>$1</em>');
    
    // Headings - must be at start of line
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    // Convert line breaks to <br>
    html = html.split('\n').map(line => {
      // Don't add <br> if line is already a heading, div, or equation
      if (line.startsWith('<h') || line.startsWith('<div')) return line;
      return line + '<br>';
    }).join('');
    
    // Preserve spaces
    html = html.replace(/>([^<]+)</g, (match, text) => {
      return '>' + text.replace(/ /g, '&nbsp;') + '<';
    });
    
    return html;
  };

  const addImageElement = () => {
    const url = prompt('Enter image URL:');
    if (url) {
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
      const embedUrl = convertToEmbedUrl(url);
      const newElement = {
        id: Date.now(),
        type: 'video',
        src: embedUrl,
        originalUrl: url, // Store original URL for reference
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
      setSelectedElement(element.id);
      setIsDragging(true);
      const rect = canvasRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left - element.x,
        y: e.clientY - rect.top - element.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (selectedTool === 'pencil' && isDrawing) {
      const rect = canvasRef.current.getBoundingClientRect();
      setCurrentPath([...currentPath, {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }]);
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
    if (selectedTool === 'pencil') {
      setIsDrawing(true);
      const rect = canvasRef.current.getBoundingClientRect();
      setCurrentPath([{ x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    }
  };

  const deleteElement = () => {
    if (selectedElement) {
      setElements(elements.filter(el => el.id !== selectedElement));
      setSelectedElement(null);
    }
  };

  const resizeElement = (id, dimension, value) => {
    setElements(elements.map(el => 
      el.id === id ? { ...el, [dimension]: parseInt(value) } : el
    ));
  };

  const generateHTML = () => {
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
        .content { font-size: 16px; line-height: 1.6; user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; }
        .element { position: absolute; }
        svg { position: absolute; top: 0; left: 0; pointer-events: none; width: 100%; height: 100%; }
        h1 { font-size: 32px; font-weight: bold; margin: 16px 0; }
        h2 { font-size: 24px; font-weight: bold; margin: 14px 0; }
        h3 { font-size: 20px; font-weight: bold; margin: 12px 0; }
        
        /* LaTeX Rendering Styles */
        .latex-rendered, .equation-display {
          display: inline-block;
          font-family: 'Times New Roman', 'Computer Modern', serif;
          font-size: 1.3rem;
          line-height: 1.4;
          margin: 0.5em 0;
          padding: 0.3em;
          text-align: center;
        }
        
        .equation-display {
          display: block;
          margin: 1em 0;
          padding: 1em;
          background: #f8f9fa;
          border-radius: 4px;
          border-left: 4px solid #007bff;
        }
        
        /* Fraction styling */
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
        
        /* Square Root styling */
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
        
        .nth-root {
          display: inline-block;
          position: relative;
          margin: 0 0.2em;
        }
        
        .root-index {
          position: absolute;
          left: -0.3em;
          top: -0.5em;
          font-size: 0.6em;
        }
        
        /* Big operators (sum, integral, product) */
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
        
        .limit {
          display: inline-block;
          position: relative;
          margin: 0 0.3em;
        }
        
        .limit .op-sub {
          position: absolute;
          bottom: -0.8em;
          left: 50%;
          transform: translateX(-50%);
          font-size: 0.7em;
          white-space: nowrap;
        }
        
        .math-text {
          font-family: Arial, sans-serif;
          font-style: normal;
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
          .latex-rendered, .equation-display {
            font-size: 1.1rem;
            padding: 1rem;
          }
          
          .fraction {
            margin: 0 0.2em;
          }
          
          .big-op {
            font-size: 1.4em;
            margin: 0 0.3em;
          }
          
          .sqrt {
            font-size: 1.1em;
          }
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
        html += `\n        <img class="element" src="${el.src}" style="left: ${el.x}px; top: ${el.y}px; width: ${el.width}px; height: ${el.height}px;" alt="Image"/>`;
      } else if (el.type === 'video') {
        html += `\n        <iframe class="element" src="${el.src}" style="left: ${el.x}px; top: ${el.y}px; width: ${el.width}px; height: ${el.height}px;" frameborder="0" allowfullscreen></iframe>`;
      }
    });

    html += `\n    </div>
</body>
</html>`;

    return html;
  };

  const downloadHTML = () => {
    const html = generateHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadHTML = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.html';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const htmlContent = event.target.result;
          
          // Extract markdown content from HTML
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlContent, 'text/html');
          const contentDiv = doc.querySelector('.content');
          
          if (contentDiv) {
            // Try to reverse parse HTML back to markdown
            let extractedText = contentDiv.innerHTML;
            
            // Remove <br> tags
            extractedText = extractedText.replace(/<br\s*\/?>/gi, '\n');
            
            // Convert headings
            extractedText = extractedText.replace(/<h1>(.*?)<\/h1>/gi, '# $1\n');
            extractedText = extractedText.replace(/<h2>(.*?)<\/h2>/gi, '## $1\n');
            extractedText = extractedText.replace(/<h3>(.*?)<\/h3>/gi, '### $1\n');
            
            // Convert bold and italic
            extractedText = extractedText.replace(/<strong>(.*?)<\/strong>/gi, '**$1**');
            extractedText = extractedText.replace(/<em>(.*?)<\/em>/gi, '*$1*');
            
            // Convert color spans
            extractedText = extractedText.replace(/<span style="color:\s*([^"]+)">(.*?)<\/span>/gi, '[c=$1]$2[/c]');
            
            // Convert font size spans
            extractedText = extractedText.replace(/<span style="font-size:\s*(\d+)px">(.*?)<\/span>/gi, '[f=$1]$2[/f]');
            
            // Convert line spacing divs
            extractedText = extractedText.replace(/<div style="line-height:\s*([0-9.]+)">(.*?)<\/div>/gi, '[lsp=$1]$2[/lsp]');
            
            // Convert space divs
            extractedText = extractedText.replace(/<div style="height:\s*(\d+)px"><\/div>/gi, '[space=$1][/space]');
            
            // Convert equation displays back to [eq] tags
            extractedText = extractedText.replace(/<div class="equation-display">(.*?)<\/div>/gi, '[eq]$1[/eq]');
            
            // Remove remaining HTML tags
            extractedText = extractedText.replace(/<[^>]+>/g, '');
            
            // Decode HTML entities
            extractedText = extractedText.replace(/&nbsp;/g, ' ');
            extractedText = extractedText.replace(/&lt;/g, '<');
            extractedText = extractedText.replace(/&gt;/g, '>');
            extractedText = extractedText.replace(/&amp;/g, '&');
            
            setMarkdown(extractedText);
          }
          
          // Extract drawing elements, images, and videos
          const svgPaths = doc.querySelectorAll('svg path');
          const imgs = doc.querySelectorAll('img.element');
          const iframes = doc.querySelectorAll('iframe.element');
          
          const loadedElements = [];
          
          // Load drawings
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
          
          // Load images
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
          
          // Load videos
          iframes.forEach((iframe, index) => {
            const style = iframe.style;
            loadedElements.push({
              id: Date.now() + 2000 + index,
              type: 'video',
              src: iframe.getAttribute('src'),
              x: parseInt(style.left) || 100,
              y: parseInt(style.top) || 100,
              width: parseInt(style.width) || 400,
              height: parseInt(style.height) || 300
            });
          });
          
          setElements(loadedElements);
          alert('HTML file loaded successfully!');
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
          onClick={() => setSelectedTool('pencil')}
          style={selectedTool === 'pencil' ? activeButtonStyle : buttonStyle}
          title="Pencil Tool"
        >
          <Pencil size={20} />
        </button>
        <button
          onClick={() => setSelectedTool('move')}
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
          onClick={deleteElement}
          style={{ ...buttonStyle, backgroundColor: '#ef4444', color: 'white' }}
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
        
        <button
          onClick={loadHTML}
          style={{ ...buttonStyle, backgroundColor: '#22c55e', color: 'white', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Upload size={20} /> Load
        </button>
        <button
          onClick={downloadHTML}
          style={{ ...buttonStyle, backgroundColor: '#3b82f6', color: 'white', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Download size={20} /> Download
        </button>
        <button
          onClick={clearAll}
          style={{ ...buttonStyle, backgroundColor: '#ef4444', color: 'white', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Trash2 size={20} /> Clear All
        </button>
        
        {saveStatus && saveStatus !== 'Saved' && (
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
              cursor: selectedTool === 'pencil' ? 'crosshair' : 'default'
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
                fontFamily: 'Arial, sans-serif',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none'
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
                      cursor: 'pointer',
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
                  <iframe
                    key={el.id}
                    src={el.src}
                    style={{
                      position: 'absolute',
                      left: el.x,
                      top: el.y,
                      width: el.width,
                      height: el.height,
                      border: 'none',
                      outline: selectedElement === el.id ? '2px solid #3b82f6' : 'none',
                      zIndex: 5
                    }}
                    onMouseDown={(e) => handleMouseDown(e, el)}
                    onClick={() => setSelectedElement(el.id)}
                    allowFullScreen
                  />
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