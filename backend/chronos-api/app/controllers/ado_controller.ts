import type { HttpContext } from '@adonisjs/core/http'
import axios from 'axios'

export default class AdoController {
  private createAuthHeader(pat: string) {
    const trimmedPat = pat.trim()
    if (!trimmedPat) {
      throw new Error('PAT cannot be empty')
    }
    const encodedPat = Buffer.from(`:${trimmedPat}`).toString('base64')
    return `Basic ${encodedPat}`
  }

  private createAuthHeaderWithUsername(pat: string, username: string = '') {
    const trimmedPat = pat.trim()
    if (!trimmedPat) {
      throw new Error('PAT cannot be empty')
    }
    const encodedPat = Buffer.from(`${username}:${trimmedPat}`).toString('base64')
    return `Basic ${encodedPat}`
  }

  private extractErrorMessage(errorData: any): string | null {
    if (!errorData) return null
    
    if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
      return errorData.errors[0].message || errorData.errors[0].code || 'Unknown error'
    }
    
    if (errorData.message) {
      return errorData.message
    }
    
    if (typeof errorData === 'string') {
      return errorData
    }
    
    return null
  }

  async search({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const { query } = request.qs()

    if (!user.adoPat || !user.adoOrg || !user.adoProject) {
      return response.badRequest('ADO configuration missing')
    }

    const wiql = `SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.Title] CONTAINS '${query}' AND [System.TeamProject] = '${user.adoProject}'`

    try {
      const pat = user.adoPat.trim()
      if (!pat) {
        return response.badRequest('ADO PAT is empty or invalid')
      }
      const authHeader = this.createAuthHeader(pat)

      const result = await axios.post(
        `https://dev.azure.com/${user.adoOrg}/${user.adoProject}/_apis/wit/wiql?api-version=7.1`,
        { query: wiql },
        { headers: { Authorization: authHeader, 'Content-Type': 'application/json' } }
      )

      const workItems = result.data.workItems

      if (workItems.length === 0) return []

      const ids = workItems
        .slice(0, 10)
        .map((wi: any) => wi.id)
        .join(',')
      const details = await axios.get(
        `https://dev.azure.com/${user.adoOrg}/${user.adoProject}/_apis/wit/workitems?ids=${ids}&fields=System.Id,System.Title&api-version=7.1`,
        { headers: { Authorization: authHeader, 'Content-Type': 'application/json' } }
      )

      return details.data.value
    } catch (error: any) {
      console.error('ADO Search API Error:', {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        message: error?.message,
      })
      const status = error?.response?.status
      if (status === 401 || status === 403) {
        return response.badRequest('Invalid ADO PAT or insufficient permissions. Please verify your PAT has read access to work items.')
      }
      return response.internalServerError(`ADO API Error: ${error?.response?.data?.message || error?.message || 'Unknown error'}`)
    }
  }

  async organizations({ auth, response }: HttpContext) {
    const user = auth.user!

    if (!user.adoPat) {
      return response.badRequest('ADO PAT missing')
    }

    const pat = user.adoPat.trim()
    if (!pat) {
      return response.badRequest('ADO PAT is empty or invalid')
    }

    try {
      const authHeader = this.createAuthHeader(pat)

      console.log('Attempting to fetch ADO organizations with PAT length:', pat.length)

      const organizations: string[] = []

      try {
        const profileResponse = await axios.get(
          'https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=7.1',
          { 
            headers: { 
              Authorization: authHeader,
              'Content-Type': 'application/json'
            }
          }
        )

        const memberId = profileResponse.data.id
        console.log('Successfully retrieved profile, memberId:', memberId)

        const accountsResponse = await axios.get(
          `https://app.vssps.visualstudio.com/_apis/accounts?memberId=${memberId}&api-version=7.1`,
          { 
            headers: { 
              Authorization: authHeader,
              'Content-Type': 'application/json'
            }
          }
        )

        const accountNames = accountsResponse.data.value.map((account: any) => account.accountName)
        organizations.push(...accountNames)
        console.log('Successfully retrieved organizations via Accounts API:', accountNames.length)
      } catch (profileError: any) {
        console.log('Profile/Accounts API failed, trying alternative method')
        console.log('Error status:', profileError?.response?.status)
        console.log('Error data:', JSON.stringify(profileError?.response?.data, null, 2))
        
        const errorMessage = this.extractErrorMessage(profileError?.response?.data)
        if (errorMessage) {
          console.log('Extracted error message:', errorMessage)
        }

        if (user.microsoftOrganizations && user.microsoftOrganizations.length > 0) {
          console.log('Using Microsoft organizations as fallback')
          organizations.push(...user.microsoftOrganizations)
        }

        if (user.adoOrg) {
          console.log('Validating PAT with existing organization:', user.adoOrg)
          try {
            const testResponse = await axios.get(
              `https://dev.azure.com/${user.adoOrg}/_apis/projects?api-version=7.1&$top=1`,
              { 
                headers: { 
                  Authorization: authHeader,
                  'Content-Type': 'application/json'
                }
              }
            )
            console.log('PAT validation successful with existing organization')
            if (!organizations.includes(user.adoOrg)) {
              organizations.push(user.adoOrg)
            }
          } catch (testError: any) {
            console.log('PAT validation failed:', testError?.response?.status)
            if (testError?.response?.status === 401) {
              throw {
                response: {
                  status: 401,
                  statusText: 'Unauthorized',
                  data: {
                    message: 'PAT is invalid or expired. Please create a new PAT with "All accessible organizations" scope and the following permissions: User Profile (Read) and Accounts (Read).'
                  }
                },
                message: 'PAT validation failed'
              }
            }
          }
        }

        if (organizations.length === 0) {
          const extractedMessage = this.extractErrorMessage(profileError?.response?.data)
          const defaultMessage = 'Unable to retrieve organizations. The Profile/Accounts API requires a PAT with "All accessible organizations" scope. Please manually enter your organization name, or create a new PAT with User Profile (Read) and Accounts (Read) permissions.'
          
          const errorDetails = {
            status: profileError?.response?.status || 401,
            statusText: profileError?.response?.statusText || 'Unauthorized',
            data: profileError?.response?.data || { 
              message: extractedMessage || defaultMessage
            },
            message: extractedMessage || profileError?.message || 'Authentication failed'
          }
          
          throw {
            response: {
              status: 401,
              statusText: 'Unauthorized',
              data: {
                errors: [{ message: extractedMessage || defaultMessage }],
                ...errorDetails.data
              }
            },
            message: extractedMessage || 'Unable to retrieve organizations via API',
            ...errorDetails
          }
        }
      }

      return organizations.length > 0 ? organizations : []
    } catch (error: any) {
      console.error('ADO Organizations API Error:', {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: JSON.stringify(error?.response?.data, null, 2),
        message: error?.message,
        patLength: pat?.length,
        hasPat: !!pat,
      })
      
      const status = error?.response?.status
      if (status === 401 || status === 403) {
        const extractedMessage = this.extractErrorMessage(error?.response?.data)
        const errorMessage = extractedMessage || error?.response?.data?.message || error?.response?.data?.type || 'Unauthorized access'
        
        let userMessage = `Invalid ADO PAT or insufficient permissions: ${errorMessage}.`
        
        if (errorMessage.includes('Unauthorized access') || errorMessage.toLowerCase().includes('unauthorized')) {
          userMessage += ' The Profile/Accounts API may require OAuth authentication or a PAT with "All accessible organizations" scope. Please manually enter your organization name in the settings, or create a new PAT with User Profile (Read) and Accounts (Read) permissions set to "All accessible organizations".'
        } else {
          userMessage += ' Please verify your PAT is valid, not expired, and has the correct scopes (User Profile (Read) and Accounts (Read)).'
        }
        
        return response.badRequest(userMessage)
      }
      
      const extractedMessage = this.extractErrorMessage(error?.response?.data)
      return response.internalServerError(`ADO API Error: ${extractedMessage || error?.response?.data?.message || error?.message || 'Unknown error'}`)
    }
  }

  async projects({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const { org } = request.qs()
    const organization = org || user.adoOrg

    if (!user.adoPat || !organization) {
      return response.badRequest('ADO organization or PAT missing')
    }

    try {
      const pat = user.adoPat.trim()
      if (!pat) {
        return response.badRequest('ADO PAT is empty or invalid')
      }
      const authHeader = this.createAuthHeader(pat)

      const projects = await axios.get(
        `https://dev.azure.com/${organization}/_apis/projects?api-version=7.1`,
        { headers: { Authorization: authHeader, 'Content-Type': 'application/json' } }
      )

      return projects.data.value.map((project: any) => project.name)
    } catch (error: any) {
      console.error('ADO Projects API Error:', {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        message: error?.message,
      })
      const status = error?.response?.status
      if (status === 401 || status === 403) {
        return response.badRequest('Invalid ADO PAT or insufficient permissions. Please verify your PAT has read access to projects.')
      }
      return response.internalServerError(`ADO API Error: ${error?.response?.data?.message || error?.message || 'Unknown error'}`)
    }
  }
}
