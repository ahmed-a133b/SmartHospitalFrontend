import React from 'react';

const TestSimpleAlert: React.FC = () => {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900">Simple Alert Test</h1>
      <p className="mt-4 text-gray-600">This is a very basic component to test if navigation works.</p>
      <div className="mt-4 p-4 bg-blue-100 rounded">
        <p>If you can see this, the navigation routing is working correctly.</p>
      </div>
    </div>
  );
};

export default TestSimpleAlert;
