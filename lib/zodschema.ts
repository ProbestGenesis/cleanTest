import z from "zod"

export const loginSchema = z.object({
  email: z.email({
    pattern: z.regexes.html5Email,
    message: "Veuillez saisir un email valide",
  }),
  password: z
    .string()
    .min(6, { message: "Le mot de passe doit contenir au moins 6 caractères" }),
  rememberMe: z.boolean().default(false),
})

export const forgotPasswordSchema = z.object({
  email: z.email({ message: "Veuillez saisir un email valide" }),
})

export const resetPasswordSchema = z
  .object({
    email: z.email({ message: "Veuillez saisir un email valide" }),
    otp: z
      .string()
      .length(6, { message: "Le code OTP doit contenir 6 chiffres" }),
    password: z
      .string()
      .min(8, {
        message: "Le mot de passe doit contenir au moins 8 caractères",
      }),
    password_confirmation: z
      .string()
      .nonempty("Veuillez confirmer votre mot de passe"),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Les mots de passe ne correspondent pas",
    path: ["password_confirmation"],
  })

export const setPasswordSchema = z.object({
  email: z.email({
    pattern: z.regexes.html5Email,
    message: "Veuillez saisir un email valide",
  }),
  matricule: z
    .string()
    .nonempty("Veuillez saisir votre N° de matricule")
    .min(6, { message: "Votre N° de matricule possède 6 caractères" }),
  password: z
    .string()
    .min(8, { message: "Le mot de passe doit contenir au moins 8 caractères" }),
  rememberMe: z.boolean().default(false),
})

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, { message: "Le nom doit contenir au moins 2 caractères" }),
    email: z.email({ message: "Veuillez saisir un email valide" }),
    password: z
      .string()
      .min(8, {
        message: "Le mot de passe doit contenir au moins 6 caractères",
      })
      .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule")
      .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre"),
    password_confirmation: z.string(),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Les mots de passe ne correspondent pas",
    path: ["password_confirmation"],
  })

export const workerRegisterSchema = z
  .object({
    name: z
      .string()
      .min(2, { message: "Le nom doit contenir au moins 2 caractères" }),
    email: z.email({ message: "Veuillez saisir un email valide" }),
    matricule: z.email({ message: "Veuillez saisir votre matricule" }),
    password: z.string().min(8, {
      message: "Le mot de passe doit contenir au moins 6 caractères",
    }),
    password_confirmation: z
      .string()
      .nonempty("Veuillez confirmer votre mot de passe"),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Les mots de passe ne correspondent pas",
    path: ["password_confirmation"],
  })

export enum WorkerType {
  CDI = "CDI",
  CDD = "CDD",
  Trainee = "Trainee",
}

const salarySchema = z
  .object({
    gross: z
      .number()
      .positive({ message: "Le salaire brut doit être un nombre positif" }),
    net: z
      .number()
      .positive({ message: "Le salaire net doit être un nombre positif" })
      .optional(),
    currency: z.string().length(3).optional(), // ISO 4217 ex: XOF, EUR, USD
    frequency: z
      .enum(
        ["MONTHLY", "WEEKLY", "ANNUAL"] as const,
        "Périodicité invalide (MONTHLY, WEEKLY, ANNUAL)"
      )
      .optional(),
    bonuses: z.number().nonnegative().optional(),
    deductions: z
      .array(
        z.object({
          label: z.string().min(1),
          amount: z.number().nonnegative(),
        })
      )
      .optional(),
  })
  .refine(
    (s) => {
      if (s.net !== undefined) return s.net <= s.gross
      return true
    },
    {
      message: "Le salaire net ne peut pas dépasser le salaire brut",
      path: ["net"],
    }
  )

export const createWorker = z
  .object({
    name: z.string().min(2, "Votre nom doit contenir au moins 2 caractères"),
    email: z.email({
      pattern: z.regexes.html5Email,
      message: "Veuillez saisir un email valide",
    }),
    date: z.date().nonoptional("Veuillez selectionner une date"),
    phone: z.string().nonempty("Veuillez sasir votre numéro de téléphone"),
    address: z.string().nonempty("Veuillez saisir un address"),
    role: z.string().nonempty("Veuillez saisir le role"),
    salary: salarySchema,
    type: z.enum(["CDI", "CDD", "TRAINEE"], {
      message: "Veuillez saisir un type valide (CDI, CDD ou Trainee)",
    }),
    image: z.file().optional(),
    contractDuration: z.string().optional(),
    expenses: z.number().nonnegative().optional(),
    // charges patronales et autres coûts RH
    employerCharges: z
      .object({
        socialContributions: z.number().nonnegative().optional(),
        retirementContributions: z.number().nonnegative().optional(),
        healthInsurance: z.number().nonnegative().optional(),
        other: z.number().nonnegative().optional(),
      })
      .optional(),
  })
  .refine(
    (data) => {
      if (data.type === "CDD" || data.type === "TRAINEE") {
        return (
          data.contractDuration !== "" && data.contractDuration !== undefined
        )
      }
      return true
    },
    {
      message: "Veuillez saisir une durée pour le contrat",
      path: ["contractDuration"],
    }
  )

export const createClient = z
  .object({
    name: z.string().min(2, "Votre nom doit contenir au moins 2 caractères"),
    email: z.email("Veuillez saisir un email valide"),
    phone: z.string().min(1, "Veuillez saisir votre numéro de téléphone"),
    address: z.string().min(1, "Veuillez saisir une adresse"),

    type: z.enum(["PARTICULAR", "ENTREPRISE"]).optional(),
    image: z.string().optional(),

    lastService: z.string().optional(),
    lastProduct: z.string().optional(),
    lastPrice: z.number().optional(),
    totalPurchase: z.number().nonnegative().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),

    isCompany: z.boolean().optional().default(false),
    companyName: z.string().min(1).optional(),
    legalName: z.string().optional(),
    registrationNumber: z.string().optional(),
    vatNumber: z.string().optional(),
    legalForm: z.string().optional(),
    industry: z.string().optional(),
    website: z.string().optional(),
    contactPerson: z.string().optional(),
    contactPosition: z.string().optional(),
    billingAddress: z.string().optional(),
    shippingAddress: z.string().optional(),
    numberOfEmployees: z.number().int().nonnegative().optional(),
    shareCapital: z.number().nonnegative().optional(),
    registrationDate: z.date().optional(),
    taxResidence: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isCompany) {
      if (!data.companyName || data.companyName.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Le nom de l'entreprise (companyName) est requis pour un client entreprise",
          path: ["companyName"],
        })
      }
      if (
        !data.registrationNumber ||
        data.registrationNumber.trim().length === 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Le numéro d'immatriculation (registrationNumber) est requis pour un client entreprise",
          path: ["registrationNumber"],
        })
      }
    }
    if (data.vatNumber && data.vatNumber.trim().length < 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le numéro de TVA semble trop court",
        path: ["vatNumber"],
      })
    }
  })

export const createProduct = z.object({
  name: z.string().min(2, "Votre nom doit contenir au moins 2 caractères"),
  code: z.string().min(2, "Veuillez saisir un code"),
  category: z.string().min(2, "Votre nom doit contenir au moins 2 caractères"),
  sellingPrice: z.number().nonoptional("Veuillez saisir un prix d'achat"),
  purchasePrice: z.number().nonoptional("Veuillez saisir un prix de vente"),
  status: z.string().optional(),
  quantity: z
    .number()
    .nonoptional("Veuillez saisir la quantité de produit disponible"),
  images: z.array(z.union([z.instanceof(File), z.string()])).optional(),
  brand: z.string().optional(),
  unity: z.string().nonempty("Veuillez saisir une unité"),
  main_client: z.string().optional(),
  threshold: z.number().optional(),
})

export const sellProduct = z.object({
  quantity: z
    .number()
    .min(1, "Veuillez saisir un qunatité suppérieur a 0")
    .default(1),
  name: z.string().nonempty("Veuillez saisir le nom du client"),
  purchasePrice: z.number(),
  type: z
    .enum(["DIRECT", "DELIVERY"], {
      message: "Veuillez saisir un type valide (CDI, CDD ou Trainee)",
    })
    .default("DIRECT"),
})

export const sellProductItem = z.object({
  productId: z.string().min(1, "Produit invalide"),
  quantity: z.coerce
    .number()
    .int()
    .min(1, "Veuillez saisir une quantité supérieure à 0"),
  purchasePrice: z.coerce
    .number({ message: "Veuillez saisir un prix de vente valide" })
    .finite("Veuillez saisir un prix de vente valide")
    .nonnegative("Veuillez saisir un prix de vente valide"),
})

export const sellProducts = z.object({
  name: z.string().nonempty("Veuillez saisir le nom du client"),
  type: z
    .enum(["DIRECT", "DELIVERY"], {
      message: "Veuillez saisir un type valide (DIRECT ou DELIVERY)",
    })
    .default("DIRECT"),
  items: z
    .array(sellProductItem)
    .min(1, "Veuillez sélectionner au moins un produit"),
})

export const stockOutRequest = z.object({
  productId: z.string().min(1, "Produit invalide"),
  quantity: z
    .number()
    .int()
    .min(1, "Veuillez saisir une quantité supérieure à 0"),
  reason: z
    .string()
    .trim()
    .min(3, "Veuillez renseigner la raison de la sortie")
    .max(500, "La raison est trop longue"),
  destination: z
    .string()
    .trim()
    .min(2, "Veuillez renseigner la destination")
    .max(255, "La destination est trop longue"),
})

export const stockOutItemSchema = z.object({
  productId: z.string().min(1, "Produit invalide"),
  quantity: z
    .number()
    .int()
    .min(1, "Veuillez saisir une quantité supérieure à 0"),
  reason: z
    .string()
    .trim()
    .min(3, "Veuillez renseigner la raison de la sortie")
    .max(500, "La raison est trop longue"),
  destination: z
    .string()
    .trim()
    .min(2, "Veuillez renseigner la destination")
    .max(255, "La destination est trop longue"),
})

export const bulkStockOutRequest = z.object({
  items: z
    .array(stockOutItemSchema)
    .min(1, "Veuillez sélectionner au moins un produit"),
})

export const stockReturnRequest = z.object({
  validationCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Le code de validation doit contenir 6 chiffres"),
  quantity: z
    .number()
    .int()
    .min(1, "Veuillez saisir une quantité supérieure à 0"),
  reason: z
    .string()
    .trim()
    .min(3, "Veuillez renseigner la raison du retour")
    .max(500, "La raison est trop longue"),
})

export const createOrganigram = z.object({
  name: z.string().nonempty("Veuillez saisir le nom du groupe"),
  objectif: z.string().nonempty("Veuillez saisir votre objectif"),
  description: z.string().optional(),
})

export enum Role {
  "MAGASINIER",
  "ELECTRICIEN",
  "",
}
export const workerRole = z.object({
  role: z.enum(["MAGASINIER", "ELECTRICIEN", ""], {
    message: "Veuillez saisir un role valid valide",
  }),
})

export const rapport = z.object({
  projectId: z.string().optional(),
  periode: z.enum(["MATIN", "SOIR"], {
    message: "Veuillez selectionner la periode de la journée",
  }),
  date: z.date().nonoptional("Veuillez selectionner une date"),
  title: z.string().nonempty("Veuillez saisir un titre pour votre rapport"),
  content: z.string().optional(),
  group: z.string().optional(),
})

export const paymentMethods = [
  "CASH",
  "BANK_TRANSFER",
  "CHECK",
  "MOBILE_MONEY",
  "OTHER",
] as const

export const PurchaseItemSchema = z.object({
  productId: z.string().optional(),
  productName: z.string().min(1, "Le nom du produit est requis"),
  quantity: z.coerce.number().positive("La quantité doit être supérieure à 0"),
  unitPrice: z.coerce.number().nonnegative("Le prix unitaire doit être positif"),
  totalPrice: z.coerce.number().nonnegative().optional(),
})

export const PurchaseSchema = z.object({
  NIF: z.string().optional(),
  invoiceNumber: z.string().optional(),
  amountET: z.coerce.number().optional(),
  designation: z.string().optional(),
  TVA: z.coerce.number().optional(),
  emountTTC: z.coerce.number().optional(),
  interests: z.coerce.number().nonnegative().optional().default(0),
  dueDate: z.string().optional(),

  // Champs obligatoires
  provider: z.string().optional(),
  providerId: z.string().optional(),
  date: z.string(),
  type: z.string().default("Achat"),
  category: z.string().optional(),
  brand: z.string().optional(),
  country: z.string().optional(),
  description: z.string().optional(),
  quantity: z.coerce.number().nonnegative().default(0),
  receivedQuantity: z.coerce.number().nonnegative().optional().default(0),
  unity: z.string().optional(),
  unityPrice: z.coerce.number().nonnegative().default(0),
  estimatePrice: z.coerce.number().nonnegative().default(0),
  paymentMethod: z.enum(paymentMethods).optional(),
  contact: z.string().optional(),
  projectId: z.string().optional(),

  items: z.array(PurchaseItemSchema).min(1, "Au moins un article est requis"),
  totalAmount: z.coerce.number().nonnegative().optional(),
  amountPaid: z.coerce.number().nonnegative().optional().default(0),

  images: z.array(z.union([z.instanceof(File), z.string()])).optional(),
  invoiceFile: z.instanceof(File).optional(),
})

export const createProviderSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  country: z.string().optional(),
  category: z.string().optional(),
  nif: z.string().optional(),
  contact: z.string().optional(),
})

export const ParticularTaskSchema = z.object({
  title: z.string().nonempty("Veuillez saisir un titre pour votre tâche"),
  description: z
    .string()
    .nonempty("Veuillez saisir une courte desciptions pour cette tache"),
})

export const createPrestataireSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  role: z.string().min(1, "Veuillez saisir un rôle"),
  description: z.string().optional(),
  dailyRate: z.number().positive("Le taux journalier doit être positif"),
  phone: z.string().optional(),
  email: z
    .string()
    .email("Veuillez saisir un email valide")
    .optional()
    .or(z.literal("")),
  address: z.string().optional(),
})

export const createPayrollSchema = z
  .object({
    workerId: z.string().nonempty("Veuillez sélectionner un travailleur"),
    periodStart: z.coerce.date({
      message: "Veuillez sélectionner la date de début",
    }),
    periodEnd: z.coerce.date({
      message: "Veuillez sélectionner la date de fin",
    }),
    baseSalary: z.coerce
      .number()
      .nonnegative("Le salaire brut doit être positif"),
    bonuses: z.coerce
      .number()
      .nonnegative("Les primes doivent être positives")
      .default(0),
    deductions: z.coerce
      .number()
      .nonnegative("Les retenues doivent être positives")
      .default(0),
  })
  .refine((data) => data.periodEnd >= data.periodStart, {
    message: "La date de fin doit être après la date de début",
    path: ["periodEnd"],
  })

export const expenseRequestTypes = [
  "CARBURANT",
  "MATERIEL",
  "TRANSPORT",
  "REPAS",
  "AUTRE",
] as const

export const expenseRequestSchema = z.object({
  type: z.enum(expenseRequestTypes, {
    message: "Veuillez sélectionner un type de dépense",
  }),
  reason: z
    .string()
    .trim()
    .min(5, "Veuillez préciser la raison de la dépense")
    .max(500, "La raison est trop longue"),
  estimatedAmount: z.coerce
    .number({ message: "Veuillez saisir un montant estimé valide" })
    .positive("Le montant estimé doit être supérieur à 0"),
  projectId: z.string().optional(),
})

export const createProviderPaymentSchema = z.object({
  providerId: z.string().min(1, "Veuillez sélectionner un fournisseur"),
  amount: z.coerce.number().positive("Le montant doit être supérieur à 0"),
  paymentDate: z.string().min(1, "Veuillez saisir la date du paiement"),
  method: z.enum(paymentMethods, {
    message: "Veuillez sélectionner un mode de paiement",
  }),
  reference: z.string().optional(),
  invoiceNumber: z.string().optional(),
  notes: z.string().optional(),
  purchaseId: z.string().optional(),
  images: z.array(z.union([z.instanceof(File), z.string()])).optional(),
})
