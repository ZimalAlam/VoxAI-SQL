import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

interface CollapsibleComponentProps {
  title: string;
  children: React.ReactNode;
  onToggleCollapse: (isCollapsed: boolean) => void; 
  titleStyle?: React.CSSProperties;
}

const CollapsibleComponent: React.FC<CollapsibleComponentProps> = ({
  title,
  children,
  onToggleCollapse,
  titleStyle,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleToggleCollapse = () => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    onToggleCollapse(newCollapsedState); 
  };

  return (
    <div className="relative border-b border-gray-200">
      <div
        className="p-4 bg-white rounded-t-lg shadow-md flex justify-between items-center cursor-pointer"
        onClick={handleToggleCollapse}
      >
       
        <h3 className="font-bold" style={titleStyle}>
          {title}
        </h3>
        <FontAwesomeIcon
          icon={isCollapsed ? faChevronRight : faChevronLeft}
          className="text-gray-500"
        />
      </div>
      {!isCollapsed && (
        <div
          className="max-h-64 overflow-y-auto p-4 bg-gray-50 rounded-b-lg"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#ccc #f5f5f5' }} 
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default CollapsibleComponent;
