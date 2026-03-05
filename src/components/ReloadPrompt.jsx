import React, { useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import './ReloadPrompt.css'

function ReloadPrompt() {
    const [upToDateShow, setUpToDateShow] = useState(false);

    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered: ' + r)
            if (r) {
                // Listen for manual check requests
                window.addEventListener('manual-check-updates', async () => {
                    console.log('Manual check triggered');
                    await r.update();
                    // If update() doesn't trigger a change in needRefresh, it's likely up to date
                    // Wait a bit to see if needRefresh changes
                    setTimeout(() => {
                        // Use a functional update or ref if needed, but here simple check is fine
                        // as needRefresh is from hook state
                        if (document.querySelector('.ReloadPrompt-toast') === null) {
                            setUpToDateShow(true);
                            setTimeout(() => setUpToDateShow(false), 3000);
                        }
                    }, 500);
                });

                // Check for updates every time the window regains focus
                window.addEventListener('focus', () => {
                    r.update()
                })
                // Also check periodically (e.g. every hour)
                setInterval(() => {
                    r.update()
                }, 60 * 60 * 1000)
            }
        },
        onRegisterError(error) {
            console.log('SW registration error', error)
        },
    })

    const close = () => {
        setNeedRefresh(false)
    }

    return (
        <div className="ReloadPrompt-container">
            {needRefresh && (
                <div className="ReloadPrompt-toast">
                    <div className="ReloadPrompt-message">
                        <span>New content available, click on reload button to update.</span>
                    </div>
                    <div className="ReloadPrompt-buttons">
                        <button className="ReloadPrompt-toast-button" onClick={() => updateServiceWorker(true)}>Reload</button>
                        <button className="ReloadPrompt-toast-button" onClick={() => close()}>Close</button>
                    </div>
                </div>
            )}
            {upToDateShow && !needRefresh && (
                <div className="ReloadPrompt-toast" style={{ padding: '20px', minWidth: '200px' }}>
                    <div className="ReloadPrompt-message" style={{ margin: 0 }}>
                        <span style={{ color: '#4facfe' }}>✓</span> You are up-to-date.
                    </div>
                </div>
            )}
        </div>
    )
}

export default ReloadPrompt
