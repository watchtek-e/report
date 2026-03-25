import React from 'react';
import './Card.css';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Card = ({ title, children, className = '' }: CardProps) => {
  return (
    <div className={`ui-card ${className}`}>
      {title && <h3 className="ui-card-title">{title}</h3>}
      <div className="ui-card-content">{children}</div>
    </div>
  );
};
