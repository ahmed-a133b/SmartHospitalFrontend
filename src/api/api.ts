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

    private static ensureTrailingSlash(url: string): string {
        return url.endsWith('/') ? url : `${url}/`;
    }

    private static async fetchWithTimeout(
        url: string,
        options: RequestInit = {}
    ): Promise<Response> {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

        try {
            // Ensure URL has trailing slash for FastAPI
            const urlWithSlash = this.ensureTrailingSlash(url);
            const response = await fetch(urlWithSlash, {
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
            const url = new URL(`${API_BASE_URL}${endpoint}`);
            if (params) {
                Object.entries(params).forEach(([key, value]) => {
                    url.searchParams.append(key, value);
                });
            }

            const response = await this.fetchWithTimeout(url.toString(), {
                method: 'GET',
                headers: DEFAULT_HEADERS,
            });

            return this.handleResponse<T>(response);
        } catch (error) {
            return {
                error: error instanceof Error ? error.message : 'Network error',
                status: 500,
            };
        }
    }

    static async post<T = any>(endpoint: string, data: any): Promise<ApiResponse<T>> {
        try {
            const response = await this.fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: DEFAULT_HEADERS,
                body: JSON.stringify(data),
            });

            return this.handleResponse<T>(response);
        } catch (error) {
            return {
                error: error instanceof Error ? error.message : 'Network error',
                status: 500,
            };
        }
    }

    static async put<T = any>(endpoint: string, data: any): Promise<ApiResponse<T>> {
        try {
            const response = await this.fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
                method: 'PUT',
                headers: DEFAULT_HEADERS,
                body: JSON.stringify(data),
            });

            return this.handleResponse<T>(response);
        } catch (error) {
            return {
                error: error instanceof Error ? error.message : 'Network error',
                status: 500,
            };
        }
    }

    static async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
        try {
            const response = await this.fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
                method: 'DELETE',
                headers: DEFAULT_HEADERS,
            });

            return this.handleResponse<T>(response);
        } catch (error) {
            return {
                error: error instanceof Error ? error.message : 'Network error',
                status: 500,
            };
        }
    }
} 