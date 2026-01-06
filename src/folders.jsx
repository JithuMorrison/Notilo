// src/components/FolderStructure.js
import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const FolderStructure = ({ folders, setFolders, selectedFile, setSelectedFile, currentPath, setCurrentPath }) => {
  const [expandedFolders, setExpandedFolders] = useState({});
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [folderTargetId, setFolderTargetId] = useState(null);

  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  const handleFolderClick = (folder, path) => {
    setCurrentPath(path);
  };

  const handleFileClick = (file) => {
    setSelectedFile(file);
  };

  const addFolder = (parentId) => {
    if (!newFolderName.trim()) return;

    const newFolder = {
      id: uuidv4(),
      name: newFolderName,
      folders: [],
      files: []
    };

    const updateFolders = (folders) => {
      return folders.map(folder => {
        // ✅ add ONLY to clicked folder
        if (folder.id === parentId) {
          return {
            ...folder,
            folders: [...folder.folders, newFolder]
          };
        }

        // 🔁 recurse into subfolders
        if (folder.folders?.length) {
          return {
            ...folder,
            folders: updateFolders(folder.folders)
          };
        }

        return folder;
      });
    };

    setFolders(prev => updateFolders(prev));
    setNewFolderName('');
    setShowNewFolderInput(false);
    setExpandedFolders(prev => ({ ...prev, [parentId]: true }));
  };

  const addFile = (parentId) => {
    const newFile = {
      id: uuidv4(),
      name: 'Untitled Note',
      content: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updateFolders = (folders) => {
      return folders.map(folder => {
        // ✅ ONLY add to the clicked folder
        if (folder.id === parentId) {
          return {
            ...folder,
            files: [...folder.files, newFile]
          };
        }

        // 🔁 recurse into subfolders
        if (folder.folders?.length) {
          return {
            ...folder,
            folders: updateFolders(folder.folders)
          };
        }

        return folder;
      });
    };

    setFolders(prev => updateFolders(prev));
    setSelectedFile(newFile);
  };

  const deleteItem = (itemId, isFolder) => {
    const updateFolders = (folders, currentPathIndex = 0) => {
      return folders.reduce((acc, folder) => {
        if (folder.id === itemId && currentPath.length === currentPathIndex) {
          return acc; // Skip this folder (delete it)
        }

        if (isFolder && folder.folders.some(f => f.id === itemId)) {
          return [
            ...acc,
            {
              ...folder,
              folders: folder.folders.filter(f => f.id !== itemId)
            }
          ];
        }

        if (!isFolder && folder.files.some(f => f.id === itemId)) {
          return [
            ...acc,
            {
              ...folder,
              files: folder.files.filter(f => f.id !== itemId)
            }
          ];
        }

        if (currentPath.length > 0 && currentPath[currentPathIndex] === folder.id) {
          return [
            ...acc,
            {
              ...folder,
              folders: updateFolders(folder.folders, currentPathIndex + 1)
            }
          ];
        }

        return [
          ...acc,
          {
            ...folder,
            folders: updateFolders(folder.folders, currentPathIndex)
          }
        ];
      }, []);
    };

    setFolders(prevFolders => updateFolders(prevFolders));
    if (selectedFile && selectedFile.id === itemId) {
      setSelectedFile(null);
    }
  };

  const handleContextMenu = (e, itemId, isFolder) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      itemId,
      isFolder
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const renderFolders = (folders, depth = 0, path = []) => {
    return folders.map(folder => {
      const currentFolderPath = [...path, folder.id];
      const isExpanded = expandedFolders[folder.id] || currentPath.includes(folder.id);
      
      return (
        <div key={folder.id} className="folder-container">
          <div 
            className={`folder ${currentPath[currentPath.length - 1] === folder.id ? 'active' : ''}`}
            onClick={() => handleFolderClick(folder, currentFolderPath)}
            onContextMenu={(e) => handleContextMenu(e, folder.id, true)}
            style={{ paddingLeft: `${depth * 15 + 10}px` }}
          >
            <span 
              className="folder-toggle" 
              onClick={(e) => { e.stopPropagation(); toggleFolder(folder.id); }}
            >
              {isExpanded ? '▼' : '▶'}
            </span>
            <span className="folder-icon">📁</span>
            <span className="folder-name">{folder.name}</span>
          </div>
          
          {isExpanded && (
            <div className="folder-contents">
              {renderFolders(folder.folders, depth + 1, currentFolderPath)}
              {folder.files.map(file => (
                <div 
                  key={file.id} 
                  className={`file ${selectedFile?.id === file.id ? 'active' : ''}`}
                  onClick={() => handleFileClick(file)}
                  onContextMenu={(e) => handleContextMenu(e, file.id, false)}
                  style={{ paddingLeft: `${(depth + 1) * 15 + 10}px` }}
                >
                  <span className="file-icon">📄</span>
                  <span className="file-name">{file.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    });
  };

  const findFileById = (folders, fileId) => {
    for (const folder of folders) {
      const file = folder.files?.find(f => f.id === fileId);
      if (file) return file;

      if (folder.folders?.length) {
        const found = findFileById(folder.folders, fileId);
        if (found) return found;
      }
    }
    return null;
  };

  return (
    <div className="folder-structure" onClick={closeContextMenu}>
      <div className="actions">
        <button onClick={() => addFile(currentPath.length > 0 ? currentPath[currentPath.length - 1] : 'root')}>
          + New Note
        </button>
        <button onClick={() => {
          setFolderTargetId(
            currentPath.length > 0 ? currentPath[currentPath.length - 1] : 'root'
          );
          setShowNewFolderInput(true);
          setNewFolderName('');
        }}>
          + New Folder
        </button>
      </div>

      {showNewFolderInput && (
        <div className="new-folder-input">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name"
            autoFocus
          />
          <button onClick={() => addFolder(folderTargetId)}>
            Create
          </button>
          <button onClick={() => setShowNewFolderInput(false)}>Cancel</button>
        </div>
      )}

      {renderFolders(folders)}

      {contextMenu && (
        <div 
          className="context-menu" 
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.isFolder ? (
            <>
              <button onClick={() => {
                addFile(contextMenu.itemId);
                closeContextMenu();
              }}>
                Add File
              </button>
              <button onClick={() => {
                setFolderTargetId(contextMenu.itemId);
                setShowNewFolderInput(true);
                setNewFolderName('');
                closeContextMenu();
              }}>
                Add Subfolder
              </button>
            </>
          ) : (
            <button onClick={() => {
              setSelectedFile(findFileById(folders, contextMenu.itemId));
              closeContextMenu();
            }}>
              Open
            </button>
          )}
          <button onClick={() => {
            deleteItem(contextMenu.itemId, contextMenu.isFolder);
            closeContextMenu();
          }}>
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default FolderStructure;