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
  const regex = /<link>(.*?)<\/link>/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const [fullMatch, linkText] = match;
    const start = match.index;

    if (start > lastIndex) {
      parts.push(content.slice(lastIndex, start));
    }

    parts.push(
      <a key={start} href={linkText} target="_blank" rel="noopener noreferrer" style={{ color: '#007bff' }}>
        {linkText}
      </a>
    );

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts;
}

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
               { text: 'Enter Text', formatting: [] },
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
                     { text: 'Enter Text', formatting: [] }
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
      exportedAt: new Date().toISOString()
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
      exportedAt: new Date().toISOString()
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

  const importJson = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        
        // Determine if it's a file or folder
        if (data.content !== undefined) {
          // It's a file
          const newFile = {
            ...data,
            id: uuidv4(), // Generate new ID to avoid conflicts
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
        } else {
          // It's a folder
          const newFolder = {
            ...data,
            id: uuidv4(), // Generate new ID to avoid conflicts
            folders: data.folders || [],
            files: data.files || []
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
        }
      } catch (error) {
        console.error('Error parsing JSON:', error);
        alert('Invalid JSON file');
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
      if (Array.isArray(block.content)) {
        // Convert old format to new format
        return { 
          heading: 'List', 
          items: block.content.map(item => 
            typeof item === 'string' 
              ? { text: item, sublists: [], images: [], videos: [] }
              : item
          ) 
        };
      }
      return block.content && typeof block.content === 'object' 
        ? block.content 
        : { heading: 'List', items: [{ text: 'Item 1', sublists: [], images: [], videos: [] }] };
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
    if (block.type === 'paragraph') {
      return block.content && typeof block.content === 'object' 
        ? block.content 
        : { text: block.content || 'Enter Text', formatting: [] };
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
    const newContent = { 
      ...(content || {}), 
      heading: e.target.value 
    };
    setContent(newContent);
    updateBlock(block.id, newContent);
  };

  const handleListChange = (listIndex, value) => {
    const newItems = [...(content?.items || [])];
    newItems[listIndex] = { ...newItems[listIndex], text: value };
    const newContent = { 
      ...(content || {}), 
      items: newItems 
    };
    setContent(newContent);
    updateBlock(block.id, newContent);
  };

  const addListItem = () => {
    const newItems = [...(content?.items || []), { text: 'New item', sublists: [], images: [], videos: [] }];
    const newContent = { 
      ...(content || {}), 
      items: newItems 
    };
    setContent(newContent);
    updateBlock(block.id, newContent);
  };

  const removeListItem = (listIndex) => {
    const currentItems = content?.items || [];
    if (currentItems.length <= 1) {
      deleteBlock(block.id);
      return;
    }
    const newItems = currentItems.filter((_, i) => i !== listIndex);
    const newContent = { 
      ...(content || {}), 
      items: newItems 
    };
    setContent(newContent);
    updateBlock(block.id, newContent);
  };

  const addSublist = (listIndex) => {
    const newItems = [...(content?.items || [])];
    newItems[listIndex] = {
      ...newItems[listIndex],
      sublists: [...(newItems[listIndex].sublists || []), { text: 'Subitem', sublists: [], images: [], videos: [] }]
    };
    const newContent = { 
      ...(content || {}), 
      items: newItems 
    };
    setContent(newContent);
    updateBlock(block.id, newContent);
  };

  const updateSublist = (listIndex, subIndex, value) => {
    const newItems = [...(content?.items || [])];
    newItems[listIndex].sublists[subIndex] = { ...newItems[listIndex].sublists[subIndex], text: value };
    const newContent = { 
      ...(content || {}), 
      items: newItems 
    };
    setContent(newContent);
    updateBlock(block.id, newContent);
  };

  const removeSublist = (listIndex, subIndex) => {
    const newItems = [...(content?.items || [])];
    newItems[listIndex].sublists = newItems[listIndex].sublists.filter((_, i) => i !== subIndex);
    const newContent = { 
      ...(content || {}), 
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

  const removeSubSublist = (listIndex, subIndex, subSubIndex) => {
    const newItems = [...(content?.items || [])];
    newItems[listIndex].sublists[subIndex].sublists = 
      newItems[listIndex].sublists[subIndex].sublists.filter((_, i) => i !== subSubIndex);
    const newContent = { 
      ...(content || {}), 
      items: newItems 
    };
    setContent(newContent);
    updateBlock(block.id, newContent);
  };

  // Text formatting functions
  const applyFormatting = (text, start, end, format) => {
    const newFormatting = [...(content?.formatting || [])];
    const existingIndex = newFormatting.findIndex(f => 
      f.start === start && f.end === end && f.type === format.type
    );
    
    if (existingIndex >= 0) {
      // Remove existing formatting
      newFormatting.splice(existingIndex, 1);
    } else {
      // Add new formatting
      newFormatting.push({ start, end, ...format });
    }
    
    const newContent = {
      ...(content || {}),
      formatting: newFormatting
    };
    setContent(newContent);
    updateBlock(block.id, newContent);
  };

  const renderFormattedText = (text, formatting = []) => {
    if (!formatting || formatting.length === 0) return text;
    
    const parts = [];
    let lastIndex = 0;
    
    // Sort formatting by start position
    const sortedFormatting = [...formatting].sort((a, b) => a.start - b.start);
    
    sortedFormatting.forEach((format, i) => {
      // Add text before this format
      if (format.start > lastIndex) {
        parts.push(text.slice(lastIndex, format.start));
      }
      
      // Add formatted text
      const formattedText = text.slice(format.start, format.end);
      const style = {};
      
      if (format.type === 'bold') style.fontWeight = 'bold';
      if (format.type === 'color') style.color = format.color;
      if (format.type === 'fontSize') style.fontSize = format.size + 'px';
      
      parts.push(
        <span key={i} style={style}>
          {formattedText}
        </span>
      );
      
      lastIndex = format.end;
    });
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    
    return parts;
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
        const safeParagraphContent = content && typeof content === 'object' 
          ? content 
          : { text: content || 'Enter Text', formatting: [] };
          
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
                value={safeParagraphContent.text || ''}
                onChange={(e) => {
                  const newContent = { 
                    ...(content || {}), 
                    text: e.target.value 
                  };
                  setContent(newContent);
                  updateBlock(block.id, newContent);
                }}
                className="block-paragraph"
                placeholder="Type something..."
                autoFocus
              />
              <div className="formatting-controls">
                <button 
                  onClick={() => {
                    const textarea = document.activeElement;
                    if (textarea.selectionStart !== textarea.selectionEnd) {
                      applyFormatting(
                        safeParagraphContent.text, 
                        textarea.selectionStart, 
                        textarea.selectionEnd, 
                        { type: 'bold' }
                      );
                    }
                  }}
                >
                  Bold
                </button>
                <input
                  type="color"
                  onChange={(e) => {
                    const textarea = document.activeElement;
                    if (textarea.selectionStart !== textarea.selectionEnd) {
                      applyFormatting(
                        safeParagraphContent.text, 
                        textarea.selectionStart, 
                        textarea.selectionEnd, 
                        { type: 'color', color: e.target.value }
                      );
                    }
                  }}
                  title="Text Color"
                />
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
              value={safeParagraphContent.text || ''}
              onChange={(e) => {
                const newContent = { 
                  ...(content || {}), 
                  text: e.target.value 
                };
                setContent(newContent);
                updateBlock(block.id, newContent);
              }}
              className="block-paragraph"
              placeholder="Type something..."
            />
            <div className="formatting-controls">
              <button 
                onClick={() => {
                  const textarea = document.activeElement;
                  if (textarea.selectionStart !== textarea.selectionEnd) {
                    applyFormatting(
                      safeParagraphContent.text, 
                      textarea.selectionStart, 
                      textarea.selectionEnd, 
                      { type: 'bold' }
                    );
                  }
                }}
              >
                Bold
              </button>
              <input
                type="color"
                onChange={(e) => {
                  const textarea = document.activeElement;
                  if (textarea.selectionStart !== textarea.selectionEnd) {
                    applyFormatting(
                      safeParagraphContent.text, 
                      textarea.selectionStart, 
                      textarea.selectionEnd, 
                      { type: 'color', color: e.target.value }
                    );
                  }
                }}
                title="Text Color"
              />
            </div>
          </div>
        ) : (
          <p 
            className={`block-paragraph-display ${isSelected ? 'selected' : ''}`}
            onDoubleClick={() => onDoubleClick(block.id)}
            onClick={() => onSelect(block.id)}
          >
            {renderFormattedText(safeParagraphContent.text || '', safeParagraphContent.formatting)}
          </p>
        );
      case 'list':
        const safeContent = content && typeof content === 'object' 
          ? content 
          : { heading: 'List', items: [{ text: 'Item 1', sublists: [], images: [], videos: [] }] };
        const safeItems = Array.isArray(safeContent.items) 
          ? safeContent.items.map(item => 
              typeof item === 'string' 
                ? { text: item, sublists: [], images: [], videos: [] }
                : item
            )
          : [{ text: 'Item 1', sublists: [], images: [], videos: [] }];
        
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
                    {item.sublists.map((subitem, j) => (
                      <div key={j} className="sublist-container">
                        <div className="sublist-item">
                          <input
                            type="text"
                            value={subitem.text || ''}
                            onChange={(e) => updateSublist(i, j, e.target.value)}
                            placeholder="Subitem"
                          />
                          <button onClick={() => removeSublist(i, j)}>×</button>
                          <button onClick={() => addSublistToSublist(i, j)}>+ Sub</button>
                        </div>
                        
                        {/* Nested sublists */}
                        {subitem.sublists && subitem.sublists.length > 0 && (
                          <div className="nested-sublists">
                            {subitem.sublists.map((subSubitem, k) => (
                              <div key={k} className="nested-sublist-item">
                                <input
                                  type="text"
                                  value={subSubitem.text || ''}
                                  onChange={(e) => updateSubSublist(i, j, k, e.target.value)}
                                  placeholder="Sub-subitem"
                                />
                                <button onClick={() => removeSubSublist(i, j, k)}>×</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
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
                    {item.sublists.map((subitem, j) => (
                      <div key={j} className="sublist-item">
                        <span>• {subitem.text || ''}</span>
                        <button onClick={() => removeSublist(i, j)}>×</button>
                      </div>
                    ))}
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
                    {item.sublists.map((subitem, j) => (
                      <div key={j} className="sublist-display-container">
                        <div className="sublist-item-display">
                          &nbsp;&nbsp;◦ {subitem.text || ''}
                        </div>
                        
                        {/* Nested sublists display */}
                        {subitem.sublists && subitem.sublists.length > 0 && (
                          <div className="nested-sublists-display">
                            {subitem.sublists.map((subSubitem, k) => (
                              <div key={k} className="nested-sublist-item-display">
                                &nbsp;&nbsp;&nbsp;&nbsp;▪ {subSubitem.text || ''}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
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
                placeholder="Enter LaTeX equation..."
                rows="3"
                autoFocus
              />
              <div className="equation-preview">
                <div>Preview: {safeEquationContent.latex || ''}</div>
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
              <div>Preview: {safeEquationContent.latex || ''}</div>
            </div>
          </div>
        ) : (
          <div 
            className={`equation-display ${isSelected ? 'selected' : ''}`}
            onDoubleClick={() => onDoubleClick(block.id)}
            onClick={() => onSelect(block.id)}
          >
            <div className="equation-rendered">
              {safeEquationContent.latex || ''}
            </div>
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
            <div className="drawing-controls">
              <canvas
                width={safeDrawingContent.width || 400}
                height={safeDrawingContent.height || 300}
                style={{ border: '1px solid #ccc', cursor: 'crosshair' }}
                ref={(canvas) => {
                  if (canvas && safeDrawingContent.strokes) {
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    safeDrawingContent.strokes.forEach(stroke => {
                      if (stroke.points && stroke.points.length > 1) {
                        ctx.strokeStyle = stroke.color || '#000000';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
                        stroke.points.forEach(point => {
                          ctx.lineTo(point.x, point.y);
                        });
                        ctx.stroke();
                      }
                    });
                  }
                }}
              />
              <div className="drawing-tools">
                <button onClick={() => {
                  const newContent = {
                    ...(content || {}),
                    strokes: []
                  };
                  setContent(newContent);
                  updateBlock(block.id, newContent);
                }}>
                  Clear
                </button>
                <label>Width: 
                  <input
                    type="number"
                    value={safeDrawingContent.width || 400}
                    onChange={(e) => {
                      const newContent = {
                        ...(content || {}),
                        width: parseInt(e.target.value)
                      };
                      setContent(newContent);
                      updateBlock(block.id, newContent);
                    }}
                    min="200"
                    max="800"
                  />
                </label>
                <label>Height: 
                  <input
                    type="number"
                    value={safeDrawingContent.height || 300}
                    onChange={(e) => {
                      const newContent = {
                        ...(content || {}),
                        height: parseInt(e.target.value)
                      };
                      setContent(newContent);
                      updateBlock(block.id, newContent);
                    }}
                    min="150"
                    max="600"
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
          <div className="drawing-controls">
            <canvas
              width={safeDrawingContent.width || 400}
              height={safeDrawingContent.height || 300}
              style={{ border: '1px solid #ccc', cursor: 'crosshair' }}
              ref={(canvas) => {
                if (canvas && safeDrawingContent.strokes) {
                  const ctx = canvas.getContext('2d');
                  ctx.clearRect(0, 0, canvas.width, canvas.height);
                  safeDrawingContent.strokes.forEach(stroke => {
                    if (stroke.points && stroke.points.length > 1) {
                      ctx.strokeStyle = stroke.color || '#000000';
                      ctx.lineWidth = 2;
                      ctx.beginPath();
                      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
                      stroke.points.forEach(point => {
                        ctx.lineTo(point.x, point.y);
                      });
                      ctx.stroke();
                    }
                  });
                }
              }}
            />
            <div className="drawing-tools">
              <button onClick={() => {
                const newContent = {
                  ...(content || {}),
                  strokes: []
                };
                setContent(newContent);
                updateBlock(block.id, newContent);
              }}>
                Clear
              </button>
            </div>
          </div>
        ) : (
          <div 
            className={`drawing-display ${isSelected ? 'selected' : ''}`}
            onDoubleClick={() => onDoubleClick(block.id)}
            onClick={() => onSelect(block.id)}
          >
            <canvas
              width={safeDrawingContent.width || 400}
              height={safeDrawingContent.height || 300}
              style={{ border: '1px solid #ccc' }}
              ref={(canvas) => {
                if (canvas && safeDrawingContent.strokes) {
                  const ctx = canvas.getContext('2d');
                  ctx.clearRect(0, 0, canvas.width, canvas.height);
                  safeDrawingContent.strokes.forEach(stroke => {
                    if (stroke.points && stroke.points.length > 1) {
                      ctx.strokeStyle = stroke.color || '#000000';
                      ctx.lineWidth = 2;
                      ctx.beginPath();
                      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
                      stroke.points.forEach(point => {
                        ctx.lineTo(point.x, point.y);
                      });
                      ctx.stroke();
                    }
                  });
                }
              }}
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