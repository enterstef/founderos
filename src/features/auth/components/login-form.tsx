'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

import { LoginSchema, type LoginInput } from '../schemas'
import { signIn, signUp } from '../actions'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function LoginForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  
  const form = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  async function onSubmit(data: LoginInput, mode: 'signin' | 'signup') {
    setIsLoading(true)
    
    try {
      const result = mode === 'signin' ? await signIn(data) : await signUp(data)
      
      if (result.error) {
        toast({
          variant: 'destructive',
          title: 'Eroare',
          description: result.error,
        })
      } else {
        toast({
          title: 'Succes',
          description: mode === 'signin' ? 'Te-ai autentificat cu succes.' : 'Cont creat cu succes. Te rugăm să te autentifici.',
        })
        if (mode === 'signin') {
          // Middleware will redirect properly or we can do router.push('/') which triggers middleware
          router.push('/')
          router.refresh()
        } else {
          // Switch to sign in tab
          const loginTab = document.querySelector('[data-value="login"]') as HTMLElement
          if (loginTab) loginTab.click()
        }
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Eroare',
        description: 'A apărut o problemă neașteptată.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-[400px]">
      <Tabs defaultValue="login" className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl text-center">FoundersOS</CardTitle>
          <CardDescription className="text-center">
            Digitalizarea ghidată a companiei tale
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">Autentificare</TabsTrigger>
            <TabsTrigger value="register">Creare cont</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <Form {...form}>
              <form onSubmit={form.handleSubmit((d) => onSubmit(d, 'signin'))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="nume@companie.ro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parolă</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Intră în cont
                </Button>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="register">
            <Form {...form}>
              <form onSubmit={form.handleSubmit((d) => onSubmit(d, 'signup'))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="nume@companie.ro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parolă</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Creează cont
                </Button>
              </form>
            </Form>
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  )
}
