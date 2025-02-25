import { Container } from '@/pages/ContainerPage'
import LandingPage from '@/pages/LandingPage'

const isLoggedIn = true

export default function Home() {
  return isLoggedIn ? <Container /> : <LandingPage />
}
