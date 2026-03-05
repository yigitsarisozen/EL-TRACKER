import React from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import './ReloadPrompt.css'

function ReloadPrompt() {
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered: ' + r)
            if (r) {
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
        </div>
    )
}

export default ReloadPrompt
