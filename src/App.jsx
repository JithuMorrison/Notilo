// src/App.js
import React, { useState, useEffect } from 'react';
import FolderStructure from './folders';
import FileEditor from './file';
import './App.css';

function App() {
  const [folders, setFolders] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentPath, setCurrentPath] = useState([]);

  // Load data from localStorage on initial render
  useEffect(() => {
    const savedData = localStorage.getItem('notesAppData');
    if (savedData) {
      setFolders(JSON.parse(savedData));
    } else {
      // Initialize with a default folder if no data exists
      const defaultFolders = [
        {
          id: 'root',
          name: 'My Notes',
          folders: [],
          files: []
        }
      ];
      setFolders(defaultFolders);
      localStorage.setItem('notesAppData', JSON.stringify(defaultFolders));
    }
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (folders.length > 0) {
      localStorage.setItem('notesAppData', JSON.stringify(folders));
    }
  }, [folders]);

  return (
    <div className="app">
      <div className="sidebar">
        <FolderStructure 
          folders={folders} 
          setFolders={setFolders}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          currentPath={currentPath}
          setCurrentPath={setCurrentPath}
        />
      </div>
      <div className="main-content">
        <FileEditor 
          selectedFile={selectedFile} 
          setSelectedFile={setSelectedFile}
          folders={folders}
          setFolders={setFolders}
          currentPath={currentPath}
        />
      </div>
    </div>
  );
}

export default App;