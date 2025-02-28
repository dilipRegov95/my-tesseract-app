import React, { useState } from 'react';
import classnames from 'classnames';

interface FileDropZoneProps {
  onDrop: (file: File) => void;
}

const FileDropZone: React.FC<FileDropZoneProps> = ({ onDrop }) => {
  const [dragHover, setDragHover] = useState(false);

  return (
    <div
      className={classnames('FileDropZone', { 'is-hovered': dragHover })}
      onDragLeave={() => setDragHover(false)}
      onDragOver={(e) => {
        e.preventDefault();
        setDragHover(true);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragHover(false);

        const file = e.dataTransfer?.files[0];
        if (file) onDrop(file);
      }}
    >
      Drop an image here to OCR it
      <div>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onDrop(file);
          }}
        />
      </div>
    </div>
  );
};

export default FileDropZone;
