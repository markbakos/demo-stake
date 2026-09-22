import { useEffect } from 'react'

type PageMetadata = {
  title: string
  description: string
  socialDescription: string
  image: string
  imageAlt: string
  schema: Record<string, unknown>
}

export function usePageMetadata(metadata: PageMetadata) {
  useEffect(() => {
    const elements = [
      document.querySelector<HTMLMetaElement>('meta[name="description"]'),
      document.querySelector<HTMLMetaElement>('meta[property="og:title"]'),
      document.querySelector<HTMLMetaElement>('meta[property="og:description"]'),
      document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]'),
      document.querySelector<HTMLMetaElement>('meta[name="twitter:description"]'),
      document.querySelector<HTMLMetaElement>('meta[property="og:image"]'),
      document.querySelector<HTMLMetaElement>('meta[property="og:image:alt"]'),
      document.querySelector<HTMLMetaElement>('meta[name="twitter:image"]'),
      document.querySelector<HTMLMetaElement>('meta[name="twitter:image:alt"]'),
    ]
    const schema = document.querySelector<HTMLScriptElement>('script[type="application/ld+json"]')
    const previousTitle = document.title
    const previous = elements.map((element) => element?.content)
    const previousSchema = schema?.textContent
    const values = [
      metadata.description,
      metadata.title,
      metadata.socialDescription,
      metadata.title,
      metadata.socialDescription,
      metadata.image,
      metadata.imageAlt,
      metadata.image,
      metadata.imageAlt,
    ]

    document.title = metadata.title
    elements.forEach((element, index) => {
      if (element) element.content = values[index]
    })
    if (schema) schema.textContent = JSON.stringify(metadata.schema)

    return () => {
      document.title = previousTitle
      elements.forEach((element, index) => {
        if (element && previous[index] !== undefined) element.content = previous[index]
      })
      if (schema && previousSchema !== undefined) schema.textContent = previousSchema
    }
  }, [metadata])
}
