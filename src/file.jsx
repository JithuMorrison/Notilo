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
      content: type === 'heading' ? 'Heading' : type === 'list' ? { heading: 'List Heading', items: ['Item 1'] } : 'Enter Text',
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
            content: newType === 'list' ? { heading: 'List Heading', items: ['Item 1'] } : 'Enter Text'
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
        return { heading: 'List', items: block.content };
      }
      return block.content && typeof block.content === 'object' 
        ? block.content 
        : { heading: 'List', items: ['Item 1'] };
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
    const newContent = e.target.value;
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
    newItems[listIndex] = value;
    const newContent = { 
      ...(content || {}), 
      items: newItems 
    };
    setContent(newContent);
    updateBlock(block.id, newContent);
  };

  const addListItem = () => {
    const newItems = [...(content?.items || []), 'New item'];
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

  const handleTypeChange = (e) => {
    const newType = e.target.value;
    updateBlock(block.id, null, newType);
  };

  const renderBlockContent = () => {
    switch (block.type) {
      case 'heading':
        return isEditing ? (
          <div className="editing-block">
            <select
              value={block.type}
              onChange={handleTypeChange}
            >
              <option value="paragraph">Paragraph</option>
              <option value="heading">Heading</option>
              <option value="list">List</option>
            </select><br/>
            <input
              type="text"
              value={content || ''}
              onChange={handleContentChange}
              className="block-heading-input"
              placeholder="Heading"
              autoFocus
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
          <input
            type="text"
            value={content || ''}
            onChange={handleContentChange}
            className="block-heading-input"
            placeholder="Heading"
          />
        ) : (
          <h3 
            className={`block-heading-display ${isSelected ? 'selected' : ''}`}
            onDoubleClick={() => onDoubleClick(block.id)}
            onClick={() => onSelect(block.id)}
          >
            {content || ''}
          </h3>
        );
      case 'paragraph':
        return isEditing ? (
          <div className="editing-block">
            <select
              value={block.type}
              onChange={handleTypeChange}
            >
              <option value="paragraph">Paragraph</option>
              <option value="heading">Heading</option>
              <option value="list">List</option>
            </select><br/>
            <textarea
              value={content || ''}
              onChange={handleContentChange}
              className="block-paragraph"
              placeholder="Type something..."
              autoFocus
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
          <textarea
            value={content || ''}
            onChange={handleContentChange}
            className="block-paragraph"
            placeholder="Type something..."
          />
        ) : (
          <p 
            className={`block-paragraph-display ${isSelected ? 'selected' : ''}`}
            onDoubleClick={() => onDoubleClick(block.id)}
            onClick={() => onSelect(block.id)}
          >
            {content || ''}
          </p>
        );
      case 'list':
        const safeContent = content && typeof content === 'object' 
          ? content 
          : { heading: 'List', items: ['Item 1'] };
        const safeItems = Array.isArray(safeContent.items) 
          ? safeContent.items 
          : ['Item 1'];
        
        return isEditing ? (
          <div className="editing-block">
            <select
              value={block.type}
              onChange={handleTypeChange}
            >
              <option value="paragraph">Paragraph</option>
              <option value="heading">Heading</option>
              <option value="list">List</option>
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
              <div key={i} className="list-item">
                <input
                  type="text"
                  value={item || ''}
                  onChange={(e) => handleListChange(i, e.target.value)}
                  placeholder="List item"
                />
                <button onClick={() => removeListItem(i)}>×</button>
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
              <div
                key={i}
                className="list-item"
                style={{ marginBottom: i !== safeItems.length - 1 ? '1rem' : '0rem' }}
              >
                <input
                  type="text"
                  value={item || ''}
                  onChange={(e) => handleListChange(i, e.target.value)}
                  placeholder="List item"
                />
                <button onClick={() => removeListItem(i)}>×</button>
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
              <div key={i} className="list-item-display">• {item || ''}</div>
            ))}
          </div>
        );
      default:
        return null;
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
          // Add this to prevent text selection during drag
          userSelect: isDragging ? 'none' : 'auto',
        }}
        onMouseDown={(e) => {
          // Allow text selection when not in drag mode
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