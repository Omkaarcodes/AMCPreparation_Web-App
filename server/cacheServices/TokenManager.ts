import { getAuth } from 'firebase/auth';

/**
 * Secure Token Manager Class
 * Handles JWT token caching, refreshing, and secure storage in memory only
 */
class SecureTokenManager {
    private static instance: SecureTokenManager;
    private tokenCache: string | null = null;
    private tokenExpiry: number = 0;
    private refreshPromise: Promise<string> | null = null;
    private readonly REFRESH_BUFFER = 5 * 60 * 1000; // 5 minutes before expiry
    private preemptiveRefreshInterval: NodeJS.Timeout | null = null;

    private constructor() {
        this.setupPreemptiveRefresh();
    }

    public static getInstance(): SecureTokenManager {
        if (!SecureTokenManager.instance) {
            SecureTokenManager.instance = new SecureTokenManager();
        }
        return SecureTokenManager.instance;
    }

    /**
     * Check if token is valid and not expiring soon
     */
    private isTokenValid(): boolean {
        return !!(
            this.tokenCache && 
            Date.now() < (this.tokenExpiry - this.REFRESH_BUFFER)
        );
    }

    /**
     * Get a valid JWT token - returns cached token or fetches new one
     */
    public async getSecureToken(): Promise<string> {
        // Return cached token if still valid
        if (this.isTokenValid() && this.tokenCache) {
            return this.tokenCache;
        }

        // If already refreshing, return the existing promise
        if (this.refreshPromise) {
            return this.refreshPromise;
        }

        // Create new refresh promise
        this.refreshPromise = this.refreshToken();
        
        try {
            const token = await this.refreshPromise;
            return token;
        } finally {
            this.refreshPromise = null;
        }
    }

    /**
     * Fetch a fresh token from the edge function
     */
    private async refreshToken(): Promise<string> {
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (!user) {
            throw new Error('No Firebase user signed in');
        }

        try {
            console.log('Refreshing Supabase token securely...');
            const idToken = await user.getIdToken(true);
            
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
            
            const response = await fetch(`${supabaseUrl}/functions/v1/session-auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ idToken }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Token refresh failed: ${errorData.error}`);
            }

            const data = await response.json();
            
            // Cache the token securely in memory only
            this.tokenCache = data.access_token;
            
            // Set expiry time (JWT typically expires in 1 hour, we refresh 5 min early)
            this.tokenExpiry = Date.now() + (55 * 60 * 1000); // 55 minutes
            
            console.log('Token refreshed and cached securely');
            
            if (!this.tokenCache) {
                throw new Error('Failed to cache token');
            }
            
            return this.tokenCache;
            
        } catch (error) {
            // Clear cache on error
            this.clearToken();
            throw error;
        }
    }

    /**
     * Clear token cache (call on logout, etc.)
     */
    public clearToken(): void {
        this.tokenCache = null;
        this.tokenExpiry = 0;
        this.refreshPromise = null;
        console.log('Token cache cleared');
    }

    /**
     * Make a secure API call with automatic token management
     */
    public async makeSecureApiCall(url: string, options: RequestInit = {}): Promise<Response> {
        try {
            const token = await this.getSecureToken();
            const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

            const response = await fetch(url, {
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `Bearer ${token}`,
                    'apikey': anonKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                }
            });

            // If token is invalid/expired, clear cache and retry once
            if (response.status === 401 || response.status === 403) {
                console.log('Token appears invalid, clearing cache and retrying...');
                this.clearToken();
                
                const newToken = await this.getSecureToken();
                
                return fetch(url, {
                    ...options,
                    headers: {
                        ...options.headers,
                        'Authorization': `Bearer ${newToken}`,
                        'apikey': anonKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    }
                });
            }

            return response;
        } catch (error) {
            console.error('Secure API call failed:', error);
            throw error;
        }
    }

    /**
     * Setup automatic preemptive token refresh
     */
    private setupPreemptiveRefresh(): void {
        // Clear any existing interval
        if (this.preemptiveRefreshInterval) {
            clearInterval(this.preemptiveRefreshInterval);
        }

        // Check every 4 minutes if token needs refresh
        this.preemptiveRefreshInterval = setInterval(() => {
            const auth = getAuth();
            const user = auth.currentUser;
            
            if (user && this.tokenCache && Date.now() > (this.tokenExpiry - this.REFRESH_BUFFER)) {
                this.preemptiveRefresh();
            }
        }, 4 * 60 * 1000); // Check every 4 minutes
    }

    /**
     * Preemptive refresh to prevent token expiry
     */
    private async preemptiveRefresh(): Promise<void> {
        try {
            await this.getSecureToken();
            console.log('Preemptive token refresh completed');
        } catch (error) {
            console.warn('Preemptive token refresh failed:', error);
        }
    }

    /**
     * Initialize token manager (call when user logs in)
     */
    public initialize(): void {
        this.setupPreemptiveRefresh();
        console.log('Token manager initialized');
    }

    /**
     * Cleanup token manager (call when user logs out)
     */
    public cleanup(): void {
        this.clearToken();
        if (this.preemptiveRefreshInterval) {
            clearInterval(this.preemptiveRefreshInterval);
            this.preemptiveRefreshInterval = null;
        }
        console.log('Token manager cleaned up');
    }

    /**
     * Get token status for debugging
     */
    public getTokenStatus(): {
        hasToken: boolean;
        expiresIn: number | null;
        isValid: boolean;
    } {
        return {
            hasToken: !!this.tokenCache,
            expiresIn: this.tokenCache ? Math.max(0, this.tokenExpiry - Date.now()) : null,
            isValid: this.isTokenValid()
        };
    }
}

// Export singleton instance
export const tokenManager = SecureTokenManager.getInstance();

// Export class for testing purposes
export { SecureTokenManager };

// Export helper function for easy use
export const makeSecureApiCall = async (url: string, options: RequestInit = {}): Promise<Response> => {
    return tokenManager.makeSecureApiCall(url, options);
};

// Export token getter
export const getSecureToken = async (): Promise<string> => {
    return tokenManager.getSecureToken();
};