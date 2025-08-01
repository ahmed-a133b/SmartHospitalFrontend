import { API_BASE_URL, DEFAULT_HEADERS, REQUEST_TIMEOUT } from './config';

interface ApiResponse<T = any> {
    data?: T;
    error?: string;
    status: number;
    validationErrors?: Record<string, string[]>;
}

export default class Api {
    private static async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
        try {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                
                // Handle FastAPI validation errors
                if (response.status === 422 && data.detail) {
                    return {
                        error: 'Validation Error',
                        validationErrors: Array.isArray(data.detail) 
                            ? data.detail.reduce((acc: Record<string, string[]>, curr: any) => {
                                const field = curr.loc[curr.loc.length - 1];
                                if (!acc[field]) acc[field] = [];
                                acc[field].push(curr.msg);
                                return acc;
                            }, {})
                            : { general: [data.detail] },
                        status: response.status,
                    };
                }

                return {
                    data,
                    status: response.status,
                };
            }
            
            return {
                error: `Invalid response format: ${contentType}`,
                status: response.status,
            };
        } catch (error) {
            return {
                error: 'Failed to parse response',
                status: response.status,
            };
        }
    }

    private static async fetchWithTimeout(
        url: string,
        options: RequestInit = {}
    ): Promise<Response> {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

        try {
            console.log('🌐 Fetching URL:', url);
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });
            clearTimeout(id);
            return response;
        } catch (error) {
            clearTimeout(id);
            throw error;
        }
    }

    static async get<T = any>(endpoint: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
        try {
            // Ensure API_BASE_URL is valid
            if (!API_BASE_URL) {
                throw new Error('API_BASE_URL is not configured');
            }

            // Clean up endpoint to avoid double slashes
            const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
            const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
            
            const finalUrl = `${baseUrl}${cleanEndpoint}`;
            console.log('🌐 Final API URL:', finalUrl);
            console.log('🔗 Base URL:', baseUrl);
            console.log('🔗 Endpoint:', cleanEndpoint);
            
            const url = new URL(finalUrl);
            if (params) {
                Object.entries(params).forEach(([key, value]) => {
                    url.searchParams.append(key, value);
                });
            }

            console.log('🚀 Making GET request to:', url.toString());

            const response = await this.fetchWithTimeout(url.toString(), {
                method: 'GET',
                headers: DEFAULT_HEADERS,
            });

            console.log('📥 Response status:', response.status, response.statusText);
            return this.handleResponse<T>(response);
        } catch (error) {
            console.error('API GET Error:', error);
            return {
                error: error instanceof Error ? error.message : 'Network error',
                status: 500,
            };
        }
    }

    static async post<T = any>(endpoint: string, data: any): Promise<ApiResponse<T>> {
        try {
            // Ensure API_BASE_URL is valid
            if (!API_BASE_URL) {
                throw new Error('API_BASE_URL is not configured');
            }

            // Clean up endpoint to avoid double slashes
            const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
            const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
            
            const response = await this.fetchWithTimeout(`${baseUrl}${cleanEndpoint}`, {
                method: 'POST',
                headers: DEFAULT_HEADERS,
                body: JSON.stringify(data),
            });

            return this.handleResponse<T>(response);
        } catch (error) {
            console.error('API POST Error:', error);
            return {
                error: error instanceof Error ? error.message : 'Network error',
                status: 500,
            };
        }
    }

    static async put<T = any>(endpoint: string, data: any): Promise<ApiResponse<T>> {
        try {
            // Ensure API_BASE_URL is valid
            if (!API_BASE_URL) {
                throw new Error('API_BASE_URL is not configured');
            }

            // Clean up endpoint to avoid double slashes
            const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
            const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
            
            const response = await this.fetchWithTimeout(`${baseUrl}${cleanEndpoint}`, {
                method: 'PUT',
                headers: DEFAULT_HEADERS,
                body: JSON.stringify(data),
            });

            return this.handleResponse<T>(response);
        } catch (error) {
            console.error('API PUT Error:', error);
            return {
                error: error instanceof Error ? error.message : 'Network error',
                status: 500,
            };
        }
    }

    static async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
        try {
            // Ensure API_BASE_URL is valid
            if (!API_BASE_URL) {
                throw new Error('API_BASE_URL is not configured');
            }

            // Clean up endpoint to avoid double slashes
            const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
            const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
            
            const response = await this.fetchWithTimeout(`${baseUrl}${cleanEndpoint}`, {
                method: 'DELETE',
                headers: DEFAULT_HEADERS,
            });

            return this.handleResponse<T>(response);
        } catch (error) {
            console.error('API DELETE Error:', error);
            return {
                error: error instanceof Error ? error.message : 'Network error',
                status: 500,
            };
        }
    }
} 