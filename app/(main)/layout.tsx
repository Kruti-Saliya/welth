import React, { ReactNode } from 'react';

type TMainLayoutProps ={
  children: ReactNode;
}

const MainLayout: React.FC<TMainLayoutProps> = ({ children }) => {
  return (
    <div className='container mx-auto my-32'>
      {children}
    </div>
  );
};

export default MainLayout;
