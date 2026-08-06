package main


import (
	"log"
	"net/http"
	"os"
)

func main() {
	mux := http.NewServeMux()
	fileServer := http.FileServer(http.Dir(webRoot()))
	mux.Handle("/", fileServer)
 
	addr := ":" + port()
	log.Printf("TrustWera landing page serving on http://localhost%s", addr)
 
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}

func webRoot() string {
	if root := os.Getenv("WEB_ROOT"); root != "" {
		return root
	}
	return "."
}

func port() string {
	if p := os.Getenv("PORT"); p != "" {
		return p
	}
	return "8080"
}