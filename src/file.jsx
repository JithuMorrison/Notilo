// src/components/FileEditor.js
import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const FileEditor = ({ selectedFile, setSelectedFile, folders, setFolders, currentPath }) => {
  const [fileName, setFileName] = useState('');
  const [blocks, setBlocks] = useState([]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (selectedFile) {
      setFileName(selectedFile.name);
      setBlocks(selectedFile.content || []);
    } else {
      setFileName('');
      setBlocks([]);
    }
    setEditMode(false); // Reset edit mode when file changes
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
      content: type === 'heading' ? 'Heading' : type === 'list' ? { heading: 'List Heading', items: ['Item 1'] } : '',
    };
  
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    setBlocks(newBlocks);
    updateFile(newBlocks);
  };

  const updateBlock = (id, newContent, newType = null) => {
    const newBlocks = blocks.map(block => {
      if (block.id === id) {
        // When type changes, initialize content appropriately
        if (newType && newType !== block.type) {
          return { 
            ...block, 
            type: newType,
            content: newType === 'list' ? { heading: 'List Heading', items: ['Item 1'] } : ''
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

  if (!selectedFile) {
    return (
      <div className="file-editor empty">
        <div className="empty-state">
          <h2>No file selected</h2>
          <p>Select a file from the sidebar or create a new one</p>
        </div>
      </div>
    );
  }

  return (
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
          <h2 onClick={() => editMode && setIsEditingName(true)}>{fileName}</h2>
        )}
        <div className="file-meta">
          <span>Last updated: {new Date(selectedFile.updatedAt).toLocaleString()}</span>
          <button 
            className="edit-toggle"
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? 'View Mode' : 'Edit Mode'}
          </button>
        </div>
      </div>

      <div className="blocks-container">
        {blocks.length === 0 && editMode && (
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
            editMode={editMode}
          />
        ))}
      </div>
    </div>
  );
};

const Block = ({ block, index, addBlock, updateBlock, deleteBlock, moveBlock, isFirst, isLast, editMode }) => {
  const [content, setContent] = useState(() => {
    if (block.type === 'list') {
      // Handle both old array format and new object format
      if (Array.isArray(block.content)) {
        return { heading: 'List', items: block.content };
      }
      return block.content && typeof block.content === 'object' 
        ? block.content 
        : { heading: 'List', items: ['Item 1'] };
    }
    return block.content || '';
  });

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
        return editMode ? (
          <input
            type="text"
            value={content || ''}
            onChange={handleContentChange}
            className="block-heading-input"
            placeholder="Heading"
          />
        ) : (
          <h3 className="block-heading-display">{content || ''}</h3>
        );
      case 'paragraph':
        return editMode ? (
          <textarea
            value={content || ''}
            onChange={handleContentChange}
            className="block-paragraph"
            placeholder="Type something..."
          />
        ) : (
          <p className="block-paragraph-display">{content || ''}</p>
        );
      case 'list':
        // Ensure content has proper structure
        const safeContent = content && typeof content === 'object' 
          ? content 
          : { heading: 'List', items: ['Item 1'] };
        const safeItems = Array.isArray(safeContent.items) 
          ? safeContent.items 
          : ['Item 1'];
        
        return (
          <div className="block-list">
            {editMode ? (
              <input
                type="text"
                value={safeContent.heading || ''}
                onChange={handleListHeadingChange}
                className="list-heading-input"
                placeholder="List Heading"
              />
            ) : (
              <h4 className="list-heading-display">{safeContent.heading || 'List'}</h4>
            )}
            {safeItems.map((item, i) => (
              <div
                key={i}
                className="list-item"
                style={{ marginBottom: i !== safeItems.length - 1 ? '1rem' : '0rem' }}
              >
                {editMode ? (
                  <>
                    <input
                      type="text"
                      value={item || ''}
                      onChange={(e) => handleListChange(i, e.target.value)}
                      placeholder="List item"
                    />
                    <button onClick={() => removeListItem(i)}>×</button>
                  </>
                ) : (
                  <div className="list-item-display">• {item || ''}</div>
                )}
              </div>
            ))}
            {editMode && <button onClick={addListItem}>+ Add item</button>}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="block" style={{marginBottom: editMode ? '1.5rem' : '0.2rem'}}>
      {editMode && (
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
      {editMode && (
        <button 
          className="add-block-below"
          onClick={() => addBlock('paragraph', index)}
        >
          +
        </button>
      )}
    </div>
  );
};

export default FileEditor;