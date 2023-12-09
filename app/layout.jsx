import '@styles/global.css';
import Nav from '@components/Nav';
import Provider from '@components/Provider';


const RootLayout = ({ children }) => {
  
  return (
    <html lang='en'>
      <body style={{ backgroundImage: "url('/assets/images/c_background.jpg')", backgroundSize: 'cover' }}>
        <Provider>
          <div className='main'>
          </div>
          <main className='app'>
            {children}
          </main>
        </Provider>
      </body>
    </html>
  );
};

export default RootLayout;
