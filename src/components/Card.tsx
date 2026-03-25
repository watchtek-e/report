import { HTMLAttributes, ReactNode } from 'react';
import './Card.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  children: ReactNode;
}

export const Card = ({ title, children, className = '', ...props }: CardProps) => {
  return (
    <div className={`ui-card ${className}`} {...props}>
      {title && <h3 className="ui-card-title">{title}</h3>}
      <div className="ui-card-content">{children}</div>
    </div>
  );
};
