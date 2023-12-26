import React from 'react';

function EndPage() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div className="text-center">
        <h1 className="text-2xl text-red-950 font-bold mt-4 mb-6">Session Ended! Close the page!</h1>
      </div>
    </div>
  );
}

export default EndPage;
