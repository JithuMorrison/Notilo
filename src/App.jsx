// src/App.js
import React, { useState, useEffect } from 'react';
import FolderStructure from './folders';
import FileEditor from './file';
import './App.css';
import WordEditor from './make';

function App() {
  const [folders, setFolders] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentPath, setCurrentPath] = useState([]);
  const [currentSection, setCurrentSection] = useState('notes');

  const toggleSection = () => {
    const section = currentSection
    setCurrentSection(prevSection => prevSection === 'notes' ? 'make' : 'notes');
    if (section === 'make' && selectedFile?.id) {
      const savedData = localStorage.getItem('notesAppData');
      if (!savedData) return;

      const foldersFromStorage = JSON.parse(savedData);
      const realFile = findFileById(foldersFromStorage, selectedFile.id);

      if (realFile) {
        setSelectedFile(realFile);
      }
    }
  };

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

  const findFileById = (folders, fileId) => {
    for (const folder of folders) {
      if (folder.files) {
        const file = folder.files.find(f => f.id === fileId);
        if (file) return file;
      }

      if (folder.folders) {
        const found = findFileById(folder.folders, fileId);
        if (found) return found;
      }
    }
    return null;
  };

  return (
    <div className="app">
      <button style={{position:'absolute', top:'10px',left:'700px',zIndex:'99'}} className='gbtn' onClick={toggleSection}>{currentSection==='notes' ? 'Make Page' : 'Notes Page'}</button>
      {currentSection === 'make' && (<WordEditor />)}
      {currentSection === 'notes' && (
        <>
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
        </>
      )}
    </div>
  );
}

export default App;