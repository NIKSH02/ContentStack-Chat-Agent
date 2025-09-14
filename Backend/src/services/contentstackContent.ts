import axios from 'axios';

export interface ContentStackConfig {
  stackApiKey: string;
  accessToken: string; // OAuth access token instead of delivery token
  region: 'US' | 'EU' | 'AZURE_NA' | 'AZURE_EU' | 'GCP_NA';
  environment: string;
}

export interface ContentEntry {
  uid: string;
  title: string;
  url?: string;
  created_at: string;
  updated_at: string;
  content_type_uid: string;
  locale: string;
  [key: string]: any;
}

export interface ContentType {
  uid: string;
  title: string;
  description?: string;
  schema: any[];
  created_at: string;
  updated_at: string;
}

export interface ContentStackResponse<T> {
  entries?: T[];
  entry?: T;
  content_type?: ContentType;
  content_types?: ContentType[];
  count?: number;
  schema?: any[];
}

class ContentStackService {
  private config: ContentStackConfig;
  private cdnBaseUrl: string;

  constructor(config: ContentStackConfig) {
    this.config = config;
    this.cdnBaseUrl = this.getCdnBaseUrl(config.region);
  }

  /**
   * Get CDN base URL by region
   */
  private getCdnBaseUrl(region: string): string {
    switch (region) {
      case 'EU':
        return 'https://eu-cdn.contentstack.com';
      case 'AZURE_NA':
        return 'https://azure-na-cdn.contentstack.com';
      case 'AZURE_EU':
        return 'https://azure-eu-cdn.contentstack.com';
      case 'GCP_NA':
        return 'https://gcp-na-cdn.contentstack.com';
      case 'US':
        return 'https://cdn.contentstack.com';
      case 'EU':
      default:
        return 'https://eu-cdn.contentstack.com';
    }
  }

  /**
   * Get all content types
   */
  async getContentTypes(): Promise<ContentType[]> {
    try {
      const response = await axios.get(
        `${this.cdnBaseUrl}/v3/content_types`,
        {
          headers: {
            'api_key': this.config.stackApiKey,
            'access_token': this.config.accessToken, // OAuth access token
          },
          params: {
            environment: this.config.environment,
          }
        }
      );

      return response.data.content_types || [];
    } catch (error: any) {
      console.error('Error fetching content types:', error.response?.data || error.message);
      throw new Error('Failed to fetch content types');
    }
  }

  /**
   * Get entries for a specific content type
   */
  async getEntries(
    contentTypeUid: string,
    options: {
      limit?: number;
      skip?: number;
      query?: Record<string, any>;
      include?: string[];
      locale?: string;
    } = {}
  ): Promise<{ entries: ContentEntry[]; count: number }> {
    try {
      const params: any = {
        environment: this.config.environment,
        limit: options.limit || 25,
        skip: options.skip || 0,
        include_count: true,
      };

      if (options.locale) {
        params.locale = options.locale;
      }

      if (options.include && options.include.length > 0) {
        params.include = options.include;
      }

      // Add query parameters
      if (options.query) {
        Object.keys(options.query).forEach(key => {
          params[key] = options.query![key];
        });
      }

      const response = await axios.get(
        `${this.cdnBaseUrl}/v3/content_types/${contentTypeUid}/entries`,
        {
          headers: {
            'api_key': this.config.stackApiKey,
            'access_token': this.config.accessToken, // OAuth access token
          },
          params
        }
      );

      return {
        entries: response.data.entries || [],
        count: response.data.count || 0
      };
    } catch (error: any) {
      console.error('Error fetching entries:', error.response?.data || error.message);
      throw new Error(`Failed to fetch entries for content type: ${contentTypeUid}`);
    }
  }

  /**
   * Get a single entry by UID
   */
  async getEntry(
    contentTypeUid: string,
    entryUid: string,
    options: {
      include?: string[];
      locale?: string;
    } = {}
  ): Promise<ContentEntry | null> {
    try {
      const params: any = {
        environment: this.config.environment,
      };

      if (options.locale) {
        params.locale = options.locale;
      }

      if (options.include && options.include.length > 0) {
        params.include = options.include;
      }

      const response = await axios.get(
        `${this.cdnBaseUrl}/v3/content_types/${contentTypeUid}/entries/${entryUid}`,
        {
          headers: {
            'api_key': this.config.stackApiKey,
            'access_token': this.config.accessToken, // OAuth access token
          },
          params
        }
      );

      return response.data.entry || null;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error('Error fetching entry:', error.response?.data || error.message);
      throw new Error(`Failed to fetch entry: ${entryUid}`);
    }
  }

  /**
   * Search entries across all content types
   */
  async searchEntries(
    searchQuery: string,
    options: {
      contentTypes?: string[];
      limit?: number;
      skip?: number;
      locale?: string;
    } = {}
  ): Promise<{ entries: ContentEntry[]; count: number }> {
    try {
      // If specific content types are provided, search within them
      if (options.contentTypes && options.contentTypes.length > 0) {
        const allEntries: ContentEntry[] = [];
        let totalCount = 0;

        for (const contentTypeUid of options.contentTypes) {
          try {
            const result = await this.getEntries(contentTypeUid, {
              limit: options.limit,
              skip: options.skip,
              locale: options.locale,
              query: {
                $or: [
                  { title: { $regex: searchQuery, $options: 'i' } },
                  { description: { $regex: searchQuery, $options: 'i' } },
                ]
              }
            });
            allEntries.push(...result.entries);
            totalCount += result.count;
          } catch (error) {
            // Continue with other content types if one fails
            console.warn(`Failed to search in content type ${contentTypeUid}:`, error);
          }
        }

        return { entries: allEntries, count: totalCount };
      }

      // Otherwise, get all content types and search in each
      const contentTypes = await this.getContentTypes();
      const allEntries: ContentEntry[] = [];
      let totalCount = 0;

      for (const contentType of contentTypes) {
        try {
          const result = await this.getEntries(contentType.uid, {
            limit: Math.ceil((options.limit || 25) / contentTypes.length),
            skip: options.skip,
            locale: options.locale,
            query: {
              $or: [
                { title: { $regex: searchQuery, $options: 'i' } },
                { description: { $regex: searchQuery, $options: 'i' } },
              ]
            }
          });
          allEntries.push(...result.entries);
          totalCount += result.count;
        } catch (error) {
          // Continue with other content types if one fails
          console.warn(`Failed to search in content type ${contentType.uid}:`, error);
        }
      }

      return { entries: allEntries, count: totalCount };
    } catch (error: any) {
      console.error('Error searching entries:', error.response?.data || error.message);
      throw new Error('Failed to search entries');
    }
  }

  /**
   * Get all entries from all content types (for AI context)
   */
  async getAllContent(options: {
    limit?: number;
    locale?: string;
  } = {}): Promise<{ content: ContentEntry[]; contentTypes: ContentType[] }> {
    try {
      const contentTypes = await this.getContentTypes();
      const allContent: ContentEntry[] = [];

      for (const contentType of contentTypes) {
        try {
          const result = await this.getEntries(contentType.uid, {
            limit: options.limit || 100,
            locale: options.locale,
          });
          
          // Add content type information to each entry
          result.entries.forEach(entry => {
            entry._content_type = {
              uid: contentType.uid,
              title: contentType.title,
              description: contentType.description,
            };
          });

          allContent.push(...result.entries);
        } catch (error) {
          console.warn(`Failed to fetch content for type ${contentType.uid}:`, error);
        }
      }

      return {
        content: allContent,
        contentTypes
      };
    } catch (error: any) {
      console.error('Error fetching all content:', error.response?.data || error.message);
      throw new Error('Failed to fetch all content');
    }
  }

  /**
   * Get content summary for AI context
   */
  async getContentSummary(): Promise<{
    totalContentTypes: number;
    totalEntries: number;
    contentTypes: Array<{
      uid: string;
      title: string;
      entryCount: number;
      sampleEntry?: Partial<ContentEntry>;
    }>;
  }> {
    try {
      const contentTypes = await this.getContentTypes();
      const summary = {
        totalContentTypes: contentTypes.length,
        totalEntries: 0,
        contentTypes: [] as any[]
      };

      for (const contentType of contentTypes) {
        try {
          const result = await this.getEntries(contentType.uid, { limit: 1 });
          
          const typeInfo = {
            uid: contentType.uid,
            title: contentType.title,
            entryCount: result.count,
            sampleEntry: result.entries[0] ? {
              uid: result.entries[0].uid,
              title: result.entries[0].title,
              url: result.entries[0].url,
            } : undefined
          };

          summary.contentTypes.push(typeInfo);
          summary.totalEntries += result.count;
        } catch (error) {
          console.warn(`Failed to get summary for content type ${contentType.uid}:`, error);
        }
      }

      return summary;
    } catch (error: any) {
      console.error('Error getting content summary:', error.response?.data || error.message);
      throw new Error('Failed to get content summary');
    }
  }

  /**
   * Test connection to ContentStack
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getContentTypes();
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default ContentStackService;
