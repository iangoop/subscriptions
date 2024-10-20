import React from 'react';

export const LoadingText: React.FC<{ charactersQty: number }> = (props) => {
  const dummyString = '_';
  return (
    <span className="loading">
      <span>{dummyString.repeat(props.charactersQty)}</span>
    </span>
  );
};
